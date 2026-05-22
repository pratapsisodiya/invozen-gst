'use client'
import { useMemo, useState } from 'react'
import { Radar, Loader2, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { TopBar } from '../app/TopBar'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useExpenseStore } from '@/lib/store/expenseStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { detectRCMExposure } from '@/lib/gst/rcmDetector'
import { formatCurrencyWithSymbol } from '@/lib/utils/formatters'
import type { RCMFlag } from '@/types/rcm'

const CONFIDENCE_CONFIG = {
  high: { label: 'High', color: 'var(--err-600)', bg: 'var(--err-50)' },
  medium: { label: 'Medium', color: 'var(--warn-700)', bg: 'var(--warn-50)' },
  low: { label: 'Low', color: 'var(--text-muted)', bg: 'var(--surface)' },
}

interface AIResult {
  totalLiability: number
  filingAdvice: string
  categoryBreakdown: Array<{ category: string; count: number; amount: number }>
}

export function RCMDetectiveClient() {
  const { purchases } = usePurchaseStore()
  const { expenses } = useExpenseStore()
  const { profile } = useBusinessStore()
  const { addToast } = useUIStore()

  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const flags = useMemo(() => detectRCMExposure(purchases, expenses), [purchases, expenses])
  const totalLiability = flags.reduce((s, f) => s + f.rcmLiability, 0)
  const unregisteredCount = new Set(purchases.filter((p) => !p.vendorSnapshot.gstin).map((p) => p.vendorSnapshot.name)).size

  const handleAIVerify = async () => {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const [year, month] = selectedPeriod.split('-')
      const res = await fetch('/api/ai/rcm-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flags: flags.slice(0, 20),
          period: `${month}/${year}`,
          businessName: profile.businessName,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as AIResult
      setAiResult(data)
    } catch {
      addToast({ type: 'error', title: 'AI Error', message: 'Could not verify with AI. Check your API configuration.' })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="RCM Detective"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <input
              type="month"
              className="px-3 py-1.5 rounded-lg border text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            />
            <button
              onClick={handleAIVerify}
              disabled={aiLoading || flags.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
              Verify with AI
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        {/* Info banner */}
        <div className="flex gap-3 items-start px-4 py-3 rounded-xl" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}>
          <Radar className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
          <p className="text-[13px]" style={{ color: 'var(--brand-700)' }}>
            Under GST Section 9(3), purchases from unregistered vendors for services like transport (GTA), legal, security, and rent attract Reverse Charge Mechanism (RCM) — meaning you must self-assess and pay the tax. This scanner detects potential RCM liabilities automatically.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Potential RCM Liability</p>
            <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: totalLiability > 0 ? 'var(--err-600)' : 'var(--ok-600)' }}>
              {formatCurrencyWithSymbol(totalLiability)}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Flagged Transactions</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text)' }}>{flags.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Unregistered Vendors</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text)' }}>{unregisteredCount}</p>
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>High-Confidence Flags</p>
            <p className="text-2xl font-bold mt-1" style={{ color: flags.filter((f) => f.confidence === 'high').length > 0 ? 'var(--err-600)' : 'var(--text)' }}>
              {flags.filter((f) => f.confidence === 'high').length}
            </p>
          </div>
        </div>

        {/* Flags table */}
        {flags.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center" style={{ border: '1px solid var(--border)' }}>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-ok-600" />
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>No RCM exposure detected</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>All your vendors appear to be GST-registered, or no RCM-applicable transactions were found.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Detected RCM Transactions</h3>
              <Link
                href="/reports/gstr1"
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Add to GSTR-3B <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['Vendor', 'Date', 'Description', 'Category', 'Taxable Amt', 'GST Rate', 'RCM Liability', 'Confidence'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flags.map((flag) => (
                    <FlagRow key={`${flag.sourceId}-${flag.detectedCategory}`} flag={flag} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI filing advice */}
        {aiResult && (
          <div className="rounded-xl bg-white p-4 flex flex-col gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warn-600" />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Filing Advice</h3>
              <span className="ml-auto text-sm font-bold tabular-nums" style={{ color: 'var(--err-600)' }}>
                Total: {formatCurrencyWithSymbol(aiResult.totalLiability)}
              </span>
            </div>
            <p className="text-[13px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-2)' }}>
              {aiResult.filingAdvice}
            </p>
            {aiResult.categoryBreakdown.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-1">
                {aiResult.categoryBreakdown.map((c) => (
                  <div key={c.category} className="rounded-lg p-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                    <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{c.category}</p>
                    <p className="text-[12px] tabular-nums mt-0.5" style={{ color: 'var(--err-600)' }}>{formatCurrencyWithSymbol(c.amount)}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.count} transaction{c.count > 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FlagRow({ flag }: { flag: RCMFlag }) {
  const cfg = CONFIDENCE_CONFIG[flag.confidence]
  return (
    <tr className="border-t hover:bg-ink-50/50" style={{ borderColor: 'var(--border-soft)' }}>
      <td className="px-4 py-2.5 font-medium text-[13px]" style={{ color: 'var(--text)' }}>{flag.vendorName}</td>
      <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>{new Date(flag.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
      <td className="px-4 py-2.5 text-[13px] max-w-[200px] truncate" style={{ color: 'var(--text-2)' }} title={flag.description}>{flag.description}</td>
      <td className="px-4 py-2.5 text-[12px]" style={{ color: 'var(--text)' }}>{flag.categoryLabel}</td>
      <td className="px-4 py-2.5 text-[13px] tabular-nums text-right" style={{ color: 'var(--text)' }}>{formatCurrencyWithSymbol(flag.taxableAmount)}</td>
      <td className="px-4 py-2.5 text-[13px] text-center" style={{ color: 'var(--text)' }}>{flag.applicableGSTRate}%</td>
      <td className="px-4 py-2.5 text-[13px] tabular-nums text-right font-semibold" style={{ color: 'var(--err-600)' }}>{formatCurrencyWithSymbol(flag.rcmLiability)}</td>
      <td className="px-4 py-2.5">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </span>
      </td>
    </tr>
  )
}
