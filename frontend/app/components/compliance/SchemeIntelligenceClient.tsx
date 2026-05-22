'use client'
import { useMemo, useState } from 'react'
import { GitBranch, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { TopBar } from '../app/TopBar'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useExpenseStore } from '@/lib/store/expenseStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { compareGSTSchemes } from '@/lib/gst/schemeComparison'
import { formatCurrencyWithSymbol } from '@/lib/utils/formatters'

interface AIResult {
  recommendation: string
  reasoning: string[]
  risks: string[]
  timeline: string
  switchingSteps: string[]
}

export function SchemeIntelligenceClient() {
  const { invoices } = useInvoiceStore()
  const { purchases } = usePurchaseStore()
  const { expenses } = useExpenseStore()
  const { profile } = useBusinessStore()
  const { addToast } = useUIStore()

  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const comparison = useMemo(
    () => compareGSTSchemes(invoices, purchases, profile),
    [invoices, purchases, profile]
  )

  const b2bInvoices = invoices.filter((i) => i.customerSnapshot.gstin && i.status !== 'void' && i.status !== 'draft')
  const totalRevenue = invoices.filter((i) => i.status !== 'void' && i.status !== 'draft').reduce((s, i) => s + i.grandTotal, 0)
  const b2bRevenue = b2bInvoices.reduce((s, i) => s + i.grandTotal, 0)
  const b2bRatio = totalRevenue > 0 ? (b2bRevenue / totalRevenue) * 100 : 0

  const handleAI = async () => {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/scheme-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comparison, businessContext: { industry: profile.industry, b2bRatio } }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as AIResult
      setAiResult(data)
    } catch {
      addToast({ type: 'error', title: 'AI Error', message: 'Could not generate scheme analysis' })
    } finally {
      setAiLoading(false)
    }
  }

  const recLabel = {
    stay_regular: { label: 'Stay on Regular Scheme', color: 'var(--brand-700)', bg: 'var(--brand-50)', icon: CheckCircle2 },
    switch_composition: { label: 'Consider Switching to Composition', color: 'var(--ok-700)', bg: 'var(--ok-50)', icon: CheckCircle2 },
    borderline: { label: 'Borderline — Assess Carefully', color: 'var(--warn-700)', bg: 'var(--warn-50)', icon: AlertTriangle },
    ineligible: { label: 'Not Eligible for Composition', color: 'var(--err-600)', bg: 'var(--err-50)', icon: XCircle },
  }[comparison.recommendation]

  const RecIcon = recLabel.icon

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="GST Scheme Advisor"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <button
            onClick={handleAI}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
            Get CA Analysis
          </button>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4 max-w-5xl">
        {/* Recommendation banner */}
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: recLabel.bg, border: `1px solid ${recLabel.color}30` }}
        >
          <RecIcon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: recLabel.color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: recLabel.color }}>{recLabel.label}</p>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-2)' }}>{comparison.recommendationReason}</p>
          </div>
        </div>

        {/* Eligibility blockers */}
        {comparison.eligibilityBlockers.length > 0 && (
          <div className="flex flex-col gap-1.5 px-4 py-3 rounded-xl" style={{ background: 'var(--err-50)', border: '1px solid var(--err-100)' }}>
            <p className="text-[12px] font-semibold text-err-700">Eligibility Issues</p>
            {comparison.eligibilityBlockers.map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <XCircle className="w-3.5 h-3.5 text-err-600 shrink-0 mt-0.5" />
                <span style={{ color: 'var(--err-700)' }}>{b}</span>
              </div>
            ))}
          </div>
        )}

        {/* Side-by-side comparison */}
        <div className="grid lg:grid-cols-2 gap-4">
          <SchemeCard
            title="Regular GST Scheme"
            active={comparison.currentScheme === 'regular'}
            items={[
              { label: 'Annual Output GST', value: formatCurrencyWithSymbol(comparison.regularScheme.outputGST), color: 'var(--err-600)' },
              { label: 'ITC Claimed', value: `−${formatCurrencyWithSymbol(comparison.regularScheme.itcClaimed)}`, color: 'var(--ok-600)' },
              { label: 'Net GST Paid', value: formatCurrencyWithSymbol(comparison.regularScheme.netGSTPaid), color: 'var(--text)', bold: true },
              { label: 'Annual Filings', value: `${comparison.regularScheme.annualFilings} returns` },
            ]}
            footerNote="Full ITC available. B2B customers can claim ITC from you."
          />
          <SchemeCard
            title={`Composition Scheme (${comparison.compositionScheme.compositionRate}%)`}
            active={comparison.currentScheme === 'composition'}
            disabled={!comparison.eligibleForComposition}
            items={[
              { label: 'Annual Composition Tax', value: formatCurrencyWithSymbol(comparison.compositionScheme.compositionTax), color: 'var(--err-600)' },
              { label: 'ITC Not Available', value: `₹0`, color: 'var(--text-muted)' },
              { label: 'Net GST Paid', value: formatCurrencyWithSymbol(comparison.compositionScheme.netGSTPaid), color: 'var(--text)', bold: true },
              { label: 'Annual Filings', value: `${comparison.compositionScheme.annualFilings} returns (simpler)` },
            ]}
            footerNote="No ITC allowed. B2B customers cannot claim ITC from you."
          />
        </div>

        {/* Savings indicator */}
        <div className="rounded-xl bg-white p-4 flex items-center justify-between" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Annual GST difference (Composition vs Regular)
            </p>
            <p className="text-xl font-bold mt-0.5 tabular-nums" style={{
              color: comparison.savingsIfSwitch > 0 ? 'var(--ok-600)' : comparison.savingsIfSwitch < 0 ? 'var(--err-600)' : 'var(--text)',
            }}>
              {comparison.savingsIfSwitch > 0 ? `Save ${formatCurrencyWithSymbol(comparison.savingsIfSwitch)} by switching` :
               comparison.savingsIfSwitch < 0 ? `Save ${formatCurrencyWithSymbol(Math.abs(comparison.savingsIfSwitch))} by staying regular` :
               'Both schemes are equal'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Annual Revenue</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
              {formatCurrencyWithSymbol(comparison.annualizedRevenue)}
            </p>
          </div>
        </div>

        {/* AI CA Analysis */}
        {aiResult && (
          <div className="rounded-xl bg-white p-4 flex flex-col gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>CA Analysis</h3>
            </div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{aiResult.recommendation}</p>
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Reasoning</p>
                {aiResult.reasoning.map((r, i) => (
                  <p key={i} className="text-[12px] mb-1 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-ok-600 shrink-0 mt-0.5" />
                    <span style={{ color: 'var(--text-2)' }}>{r}</span>
                  </p>
                ))}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Risks</p>
                {aiResult.risks.map((r, i) => (
                  <p key={i} className="text-[12px] mb-1 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-warn-600 shrink-0 mt-0.5" />
                    <span style={{ color: 'var(--text-2)' }}>{r}</span>
                  </p>
                ))}
              </div>
            </div>
            {aiResult.switchingSteps.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  How to Switch (Timeline: {aiResult.timeline})
                </p>
                {aiResult.switchingSteps.map((s, i) => (
                  <p key={i} className="text-[12px] mb-1 flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-600 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span style={{ color: 'var(--text-2)' }}>{s}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SchemeCard({
  title,
  active,
  disabled,
  items,
  footerNote,
}: {
  title: string
  active: boolean
  disabled?: boolean
  items: Array<{ label: string; value: string; color?: string; bold?: boolean }>
  footerNote: string
}) {
  return (
    <div
      className="rounded-xl bg-white p-4 flex flex-col gap-3"
      style={{
        border: `2px solid ${active ? 'var(--brand-600)' : 'var(--border)'}`,
        boxShadow: 'var(--shadow-sm)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h3>
        {active && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-brand-700" style={{ background: 'var(--brand-50)' }}>Current</span>
        )}
        {disabled && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-err-600" style={{ background: 'var(--err-50)' }}>Ineligible</span>
        )}
      </div>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between">
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
          <span
            className={`text-[13px] tabular-nums ${item.bold ? 'font-bold' : 'font-medium'}`}
            style={{ color: item.color ?? 'var(--text-2)' }}
          >
            {item.value}
          </span>
        </div>
      ))}
      <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>{footerNote}</p>
    </div>
  )
}
