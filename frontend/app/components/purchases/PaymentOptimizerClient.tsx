'use client'
import { useMemo, useState } from 'react'
import { ArrowUpDown, Loader2, Sparkles, Check } from 'lucide-react'
import { TopBar } from '../app/TopBar'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { computeVendorReliabilityScores } from '@/lib/gst/vendorReliability'
import { computeOptimalPaymentQueue } from '@/lib/gst/paymentOptimizer'
import { formatCurrencyWithSymbol } from '@/lib/utils/formatters'
import type { OptimalPaymentEntry } from '@/types/paymentOptimizer'

const TIER_CONFIG = {
  critical: { label: 'Critical', color: 'var(--err-600)', bg: 'var(--err-50)' },
  high: { label: 'High', color: 'var(--warn-700)', bg: 'var(--warn-50)' },
  medium: { label: 'Medium', color: 'var(--brand-700)', bg: 'var(--brand-50)' },
  low: { label: 'Low', color: 'var(--text-muted)', bg: 'var(--surface)' },
}

interface AIResult {
  alerts: string[]
  summary: string
  totalITCSaved: number
}

export function PaymentOptimizerClient() {
  const { purchases, vendors, updatePurchase } = usePurchaseStore()
  const { settings, updateBankBalance } = useBusinessStore()
  const { addToast } = useUIStore()

  const [cashInput, setCashInput] = useState(settings.currentBankBalance.toString())
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [markedPaid, setMarkedPaid] = useState<Set<string>>(new Set())

  const reliabilityScores = useMemo(
    () => computeVendorReliabilityScores(vendors, purchases),
    [vendors, purchases]
  )

  const cashAmount = parseFloat(cashInput.replace(/,/g, '')) || 0

  const queue = useMemo(
    () => computeOptimalPaymentQueue(purchases, reliabilityScores, cashAmount),
    [purchases, reliabilityScores, cashAmount]
  )

  const totalITCAtStake = queue.reduce((s, e) => s + e.itcAtStake, 0)
  const affordableITC = queue.filter((e) => e.canAfford).reduce((s, e) => s + e.itcAtStake, 0)

  const handleAI = async () => {
    if (aiLoading || queue.length === 0) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/payment-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: queue.slice(0, 15), totalCash: cashAmount, period: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as AIResult
      setAiResult(data)
    } catch {
      addToast({ type: 'error', title: 'AI Error', message: 'Could not generate AI advice' })
    } finally {
      setAiLoading(false)
    }
  }

  const handleMarkPaid = async (entry: OptimalPaymentEntry) => {
    await updatePurchase(entry.purchaseId, { itcStatus: 'claimed', status: 'claimed', itcClaimed: entry.itcAtStake })
    setMarkedPaid((prev) => new Set(prev).add(entry.purchaseId))
    updateBankBalance(Math.max(0, cashAmount - entry.amountDue))
    addToast({ type: 'success', title: 'Payment Recorded', message: `Marked ₹${entry.amountDue.toLocaleString('en-IN')} to ${entry.vendorName} as paid` })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Payment Optimizer"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Available cash:</span>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: 'var(--text-muted)' }}>₹</span>
                <input
                  type="number"
                  className="pl-5 pr-3 py-1.5 rounded-lg border text-sm w-32 tabular-nums"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  value={cashInput}
                  onChange={(e) => { setCashInput(e.target.value); updateBankBalance(parseFloat(e.target.value) || 0) }}
                />
              </div>
            </div>
            <button
              onClick={handleAI}
              disabled={aiLoading || queue.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Analysis
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Unpaid Vendor Bills</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text)' }}>{queue.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Total ITC at Stake</p>
            <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--err-600)' }}>{formatCurrencyWithSymbol(totalITCAtStake)}</p>
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>ITC Saveable (in budget)</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-ok-600">{formatCurrencyWithSymbol(affordableITC)}</p>
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Critical (≤30d deadline)</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--err-600)' }}>
              {queue.filter((e) => e.urgencyTier === 'critical').length}
            </p>
          </div>
        </div>

        {/* AI result */}
        {aiResult && (
          <div className="rounded-xl bg-white p-4 flex flex-col gap-2" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Payment Strategy</p>
            <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>{aiResult.summary}</p>
            {aiResult.alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <span className="text-warn-600 shrink-0 mt-0.5">⚠</span>
                <span style={{ color: 'var(--text-2)' }}>{a}</span>
              </div>
            ))}
            {aiResult.totalITCSaved > 0 && (
              <p className="text-[13px] font-semibold text-ok-600">
                Following this queue protects ~{formatCurrencyWithSymbol(aiResult.totalITCSaved)} in ITC
              </p>
            )}
          </div>
        )}

        {/* Queue table */}
        {queue.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center" style={{ border: '1px solid var(--border)' }}>
            <ArrowUpDown className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No unpaid vendor invoices with ITC at stake</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Optimal Payment Queue — Pay in this order</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Vendor', 'Invoice Date', 'Amount Due', 'ITC at Stake', '180d Deadline', 'Priority', 'Reason', 'Action'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queue.map((entry, i) => {
                    const isPaid = markedPaid.has(entry.purchaseId)
                    const cfg = TIER_CONFIG[entry.urgencyTier]
                    return (
                      <tr
                        key={entry.purchaseId}
                        className="border-t transition-colors"
                        style={{
                          borderColor: 'var(--border-soft)',
                          opacity: isPaid ? 0.4 : entry.canAfford ? 1 : 0.6,
                          background: !entry.canAfford && !isPaid ? 'var(--surface)' : undefined,
                        }}
                      >
                        <td className="px-3 py-2.5 text-[13px] font-bold tabular-nums" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-[13px]" style={{ color: 'var(--text)' }}>{entry.vendorName}</td>
                        <td className="px-3 py-2.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>{new Date(entry.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                        <td className="px-3 py-2.5 text-[13px] tabular-nums font-semibold" style={{ color: 'var(--text)' }}>{formatCurrencyWithSymbol(entry.amountDue)}</td>
                        <td className="px-3 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--err-600)' }}>{formatCurrencyWithSymbol(entry.itcAtStake)}</td>
                        <td className="px-3 py-2.5 text-[13px]" style={{ color: entry.daysUntil180 <= 30 ? 'var(--err-600)' : 'var(--text-muted)' }}>
                          {entry.daysUntil180}d
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] max-w-[180px]" style={{ color: 'var(--text-2)' }}>{entry.reason}</td>
                        <td className="px-3 py-2.5">
                          {isPaid ? (
                            <span className="flex items-center gap-1 text-[11px] text-ok-600"><Check className="w-3.5 h-3.5" /> Paid</span>
                          ) : (
                            <button
                              onClick={() => handleMarkPaid(entry)}
                              disabled={!entry.canAfford}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-medium border hover:bg-ok-50 transition-colors disabled:opacity-40"
                              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                Greyed-out rows exceed your available budget of {formatCurrencyWithSymbol(cashAmount)}. Pay affordable (white) rows first.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
