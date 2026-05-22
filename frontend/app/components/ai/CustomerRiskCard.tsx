'use client'
import { useState } from 'react'
import { Sparkles, Loader2, ShieldAlert, ShieldCheck, AlertTriangle, TrendingDown } from 'lucide-react'
import type { CustomerRiskResult } from '@/app/api/ai/customer-risk/route'
import type { Customer } from '@/types/customer'

interface Props {
  customer: Customer
  totalInvoiced: number
  totalPaid: number
  overdueAmount: number
  invoiceCount: number
  paidCount: number
  overdueCount: number
  avgDaysToPay: number
  lastInvoiceDate: string | null
}

const SCORE_CONFIG: Record<string, { color: string; bg: string; icon: typeof ShieldCheck; label: string }> = {
  Low: { color: 'text-brand-700', bg: 'bg-brand-50', icon: ShieldCheck, label: 'Low Risk' },
  Medium: { color: 'text-warn-700', bg: 'bg-warn-50', icon: AlertTriangle, label: 'Medium Risk' },
  High: { color: 'text-orange-700', bg: 'bg-orange-50', icon: TrendingDown, label: 'High Risk' },
  Critical: { color: 'text-err-700', bg: 'bg-err-50', icon: ShieldAlert, label: 'Critical Risk' },
}

export function CustomerRiskCard({ customer, totalInvoiced, totalPaid, overdueAmount, invoiceCount, paidCount, overdueCount, avgDaysToPay, lastInvoiceDate }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CustomerRiskResult | null>(null)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/customer-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.name,
          gstin: customer.gstin || null,
          totalInvoiced,
          totalPaid,
          overdueAmount,
          invoiceCount,
          paidCount,
          overdueCount,
          avgDaysToPay,
          creditLimit: customer.creditLimit ?? null,
          memberSince: customer.createdAt.split('T')[0],
          lastInvoiceDate,
        }),
      })
      if (!res.ok) throw new Error('AI unavailable')
      const data = await res.json() as CustomerRiskResult
      setResult(data)
    } catch {
      setError('Could not assess risk. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cfg = result ? SCORE_CONFIG[result.score] ?? SCORE_CONFIG.Medium : null
  const Icon = cfg?.icon ?? ShieldCheck

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Risk Assessment</span>
          {result && cfg && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          )}
        </div>
        {!loading && (
          <button onClick={handleAnalyze}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors">
            <Sparkles className="w-3 h-3" /> {result ? 'Re-assess' : 'Assess Risk'}
          </button>
        )}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
      </div>

      {!result && !loading && !error && (
        <div className="px-4 py-5 text-center">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-brand-200" />
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Get AI-powered credit risk analysis</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Payment behavior, overdue history, and recommended credit terms.
          </p>
        </div>
      )}

      {error && (
        <div className="px-4 py-3">
          <p className="text-xs text-err-600 bg-err-50 px-3 py-2 rounded-lg">{error}</p>
        </div>
      )}

      {loading && (
        <div className="px-4 py-5 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyzing payment behavior…</p>
        </div>
      )}

      {result && cfg && (
        <div className="p-4 flex flex-col gap-3">
          {/* Score bar */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
              <Icon className={`w-5 h-5 ${cfg.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{cfg.label}</span>
                <span className={`text-sm font-bold tabular-nums ${cfg.color}`}>{result.scoreValue}/100</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-ink-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${result.scoreValue < 26 ? 'bg-brand-500' : result.scoreValue < 51 ? 'bg-warn-500' : result.scoreValue < 76 ? 'bg-orange-500' : 'bg-err-500'}`}
                  style={{ width: `${result.scoreValue}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{result.explanation}</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg px-3 py-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Recommended Credit Limit</p>
              <p className="text-sm font-bold text-brand-700 tabular-nums">₹{result.recommendedCreditLimit.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Payment Terms</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{result.suggestedPaymentTerms}</p>
            </div>
          </div>

          <div className="rounded-lg px-3 py-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Recommended Action</p>
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{result.action}</p>
          </div>

          {result.keyFactors.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>KEY FACTORS</p>
              <ul className="flex flex-col gap-1">
                {result.keyFactors.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text)' }}>
                    <span className="w-1 h-1 rounded-full bg-brand-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
