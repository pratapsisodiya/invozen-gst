'use client'
import { useMemo, useState } from 'react'
import { TrendingUp, Loader2, RefreshCw } from 'lucide-react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { useUIStore } from '@/lib/store/uiStore'
import { buildCustomerPaymentProfiles, predictInvoicePayment } from '@/lib/reports/paymentPredictor'
import { formatCurrencyWithSymbol } from '@/lib/utils/formatters'
import type { InvoicePaymentPrediction } from '@/types/paymentPrediction'

interface Props {
  customerId: string
}

const CONFIDENCE_CONFIG = {
  high: { label: 'High confidence', color: 'var(--ok-600)' },
  medium: { label: 'Medium confidence', color: 'var(--warn-700)' },
  low: { label: 'Low confidence', color: 'var(--text-muted)' },
}

export function PaymentPredictionCard({ customerId }: Props) {
  const { invoices } = useInvoiceStore()
  const { payments } = usePaymentStore()
  const { addToast } = useUIStore()

  const [aiLoading, setAiLoading] = useState(false)
  const [aiForecast, setAiForecast] = useState<Array<{ week: string; expectedInflow: number; low: number; high: number }> | null>(null)

  const profiles = useMemo(() => buildCustomerPaymentProfiles(invoices, payments), [invoices, payments])
  const profile = profiles.find((p) => p.customerId === customerId)

  const outstandingInvoices = invoices.filter(
    (i) => i.customerId === customerId && ['sent', 'overdue'].includes(i.status) && i.balanceDue > 0
  )

  const predictions = useMemo(() => {
    return outstandingInvoices.map((inv) => predictInvoicePayment(inv, profile))
  }, [outstandingInvoices, profile])

  const handleAIForecast = async () => {
    if (aiLoading || predictions.length === 0) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/payment-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles: profile ? [profile] : [], outstandingInvoices: predictions }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setAiForecast(data.weeklyForecast ?? [])
    } catch {
      addToast({ type: 'error', title: 'AI Error', message: 'Could not generate forecast' })
    } finally {
      setAiLoading(false)
    }
  }

  if (!profile && outstandingInvoices.length === 0) return null

  return (
    <div
      className="rounded-xl bg-white p-4 flex flex-col gap-3"
      style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Payment Prediction</h3>
        </div>
        {predictions.length > 0 && (
          <button
            onClick={handleAIForecast}
            disabled={aiLoading}
            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-lg border hover:bg-ink-50 transition-colors disabled:opacity-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            AI Forecast
          </button>
        )}
      </div>

      {/* Profile stats */}
      {profile && (
        <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
          <div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Avg Days to Pay</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text)' }}>{profile.avgDaysToPay}d</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Paid Within 30d</p>
            <p className="text-sm font-bold mt-0.5 text-ok-600">{profile.paidWithin30Pct}%</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>History</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text)' }}>{profile.paidInvoices} paid</p>
          </div>
        </div>
      )}

      {/* Per-invoice predictions */}
      {predictions.length > 0 && (
        <div className="flex flex-col gap-2">
          {predictions.map((pred) => (
            <PredictionRow key={pred.invoiceId} pred={pred} />
          ))}
        </div>
      )}

      {predictions.length === 0 && (
        <p className="text-[13px] text-center py-3" style={{ color: 'var(--text-muted)' }}>No outstanding invoices</p>
      )}

      {/* AI 4-week forecast */}
      {aiForecast && aiForecast.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>4-Week Inflow Forecast</p>
          {aiForecast.map((w) => (
            <div key={w.week} className="flex items-center justify-between text-[12px]">
              <span style={{ color: 'var(--text-2)' }}>{w.week}</span>
              <span className="tabular-nums font-medium" style={{ color: 'var(--text)' }}>
                {formatCurrencyWithSymbol(w.expectedInflow)}
                <span className="ml-1 font-normal" style={{ color: 'var(--text-faint)' }}>
                  ({formatCurrencyWithSymbol(w.low)}–{formatCurrencyWithSymbol(w.high)})
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PredictionRow({ pred }: { pred: InvoicePaymentPrediction }) {
  const cfg = CONFIDENCE_CONFIG[pred.confidence]
  return (
    <div
      className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg"
      style={{ border: '1px solid var(--border-soft)' }}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>{pred.invoiceNumber}</p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {pred.daysOverdue > 0 ? `${pred.daysOverdue}d overdue · ` : ''}Expected by {new Date(pred.expectedPaymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: cfg.color }}>{pred.basis}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>{formatCurrencyWithSymbol(pred.amount)}</p>
        <div className="flex items-center gap-2 mt-1">
          <ProbBadge label="7d" pct={pred.prob7Days} />
          <ProbBadge label="30d" pct={pred.prob30Days} />
          <ProbBadge label="60d" pct={pred.prob60Days} />
        </div>
      </div>
    </div>
  )
}

function ProbBadge({ label, pct }: { label: string; pct: number }) {
  const color = pct >= 70 ? 'var(--ok-600)' : pct >= 40 ? 'var(--warn-700)' : 'var(--text-muted)'
  return (
    <span className="text-[10px] font-semibold" style={{ color }}>
      {label}: {pct}%
    </span>
  )
}
