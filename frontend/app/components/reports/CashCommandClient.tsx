'use client'
import { useMemo, useState } from 'react'
import { Landmark, Loader2, TrendingDown, TrendingUp, AlertTriangle, Edit2, Check, X } from 'lucide-react'
import { TopBar } from '../app/TopBar'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useExpenseStore } from '@/lib/store/expenseStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { computeTaxProjection } from '@/lib/gst/taxLiabilityProjection'
import { buildCustomerPaymentProfiles } from '@/lib/reports/paymentPredictor'
import { buildCashFlowForecast } from '@/lib/reports/cashFlowForecast'
import { formatCurrencyWithSymbol } from '@/lib/utils/formatters'

interface AIResult {
  executiveSummary: string
  scenarios: Array<{ name: string; description: string; netImpact: number }>
  recommendations: string[]
}

export function CashCommandClient() {
  const { invoices } = useInvoiceStore()
  const { purchases } = usePurchaseStore()
  const { expenses } = useExpenseStore()
  const { payments } = usePaymentStore()
  const { profile, settings, updateBankBalance } = useBusinessStore()
  const { addToast } = useUIStore()

  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')

  const taxProjection = useMemo(
    () => computeTaxProjection(invoices, purchases, settings.currentBankBalance),
    [invoices, purchases, settings.currentBankBalance]
  )

  const profiles = useMemo(() => buildCustomerPaymentProfiles(invoices, payments), [invoices, payments])

  const forecast = useMemo(
    () => buildCashFlowForecast(invoices, purchases, profiles, taxProjection, settings.currentBankBalance),
    [invoices, purchases, profiles, taxProjection, settings.currentBankBalance]
  )

  const handleAI = async () => {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/cashflow-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forecast, businessContext: { name: profile.businessName, industry: profile.industry } }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as AIResult
      setAiResult(data)
    } catch {
      addToast({ type: 'error', title: 'AI Error', message: 'Could not generate scenario analysis' })
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveBalance = () => {
    const val = parseFloat(balanceInput.replace(/,/g, ''))
    if (!isNaN(val) && val >= 0) updateBankBalance(val)
    setEditingBalance(false)
  }

  const netSpendable = forecast.netSpendableToday
  const spendableColor = netSpendable < 0 ? 'var(--err-600)' : netSpendable < settings.cashAlertThreshold ? 'var(--warn-600)' : 'var(--ok-600)'

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Cash Flow Command Center"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <button
            onClick={handleAI}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
            AI Scenario Analysis
          </button>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        {/* Hero: Net Spendable */}
        <div
          className="rounded-xl bg-white p-6 flex items-center justify-between"
          style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Net Spendable Today</p>
            <p className="text-4xl font-bold tabular-nums mt-1" style={{ color: spendableColor }}>
              {netSpendable < 0 ? '−' : ''}{formatCurrencyWithSymbol(Math.abs(netSpendable))}
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-faint)' }}>
              Bank balance minus current GST liability (₹{taxProjection.netLiability.toLocaleString('en-IN')} reserved)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {editingBalance ? (
              <>
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Bank balance: ₹</span>
                <input
                  type="number"
                  className="w-32 px-2 py-1.5 text-sm rounded-lg border tabular-nums"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveBalance()}
                  autoFocus
                />
                <button onClick={handleSaveBalance} className="p-1.5 rounded hover:bg-ok-50"><Check className="w-4 h-4 text-ok-600" /></button>
                <button onClick={() => setEditingBalance(false)} className="p-1.5 rounded hover:bg-err-50"><X className="w-4 h-4 text-err-500" /></button>
              </>
            ) : (
              <button
                onClick={() => { setBalanceInput(settings.currentBankBalance.toString()); setEditingBalance(true) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-ink-50 transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Bank: {formatCurrencyWithSymbol(settings.currentBankBalance)}
              </button>
            )}
          </div>
        </div>

        {/* Critical dates alert */}
        {forecast.criticalDates.filter((c) => c.type === 'low_cash').length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--err-50)', border: '1px solid var(--err-100)' }}>
            <AlertTriangle className="w-4 h-4 text-err-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-err-700">Cash warning</p>
              {forecast.criticalDates.filter((c) => c.type === 'low_cash').slice(0, 2).map((c, i) => (
                <p key={i} className="text-[12px] text-err-600">{c.date}: {c.description}</p>
              ))}
            </div>
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Expected Inflows (90d)</p>
            <p className="text-xl font-bold mt-1 tabular-nums text-ok-600">{formatCurrencyWithSymbol(forecast.totalExpectedInflows)}</p>
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Vendor Outflows (90d)</p>
            <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: 'var(--err-600)' }}>{formatCurrencyWithSymbol(forecast.totalScheduledOutflows)}</p>
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>GST Payments (90d)</p>
            <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: 'var(--warn-700)' }}>{formatCurrencyWithSymbol(forecast.totalGSTPeriod)}</p>
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Lowest Projected Balance</p>
            <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: forecast.lowestBalance.amount < 0 ? 'var(--err-600)' : 'var(--text)' }}>
              {formatCurrencyWithSymbol(forecast.lowestBalance.amount)}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{forecast.lowestBalance.date}</p>
          </div>
        </div>

        {/* Weekly forecast chart (manual bar chart, no recharts dependency) */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>90-Day Cash Flow Forecast</h3>
          <WeeklyBarChart weeks={forecast.weeks} />
        </div>

        {/* Timeline table */}
        {forecast.weeks.length > 0 && (
          <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Weekly Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['Week', 'Inflows', 'Vendor Outflows', 'GST', 'Net', 'Balance'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {forecast.weeks.map((w) => (
                    <tr
                      key={w.startDate}
                      className="border-t"
                      style={{
                        borderColor: 'var(--border-soft)',
                        background: w.isGSTWeek ? 'var(--warn-50)' : undefined,
                      }}
                    >
                      <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--text)' }}>
                        {w.weekLabel}
                        {w.isGSTWeek && <span className="ml-1.5 text-[10px] font-semibold text-warn-700 bg-warn-100 px-1.5 py-0.5 rounded-full">GST</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums text-ok-600">+{formatCurrencyWithSymbol(w.expectedInflows)}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--err-600)' }}>
                        {w.scheduledOutflows > 0 ? `−${formatCurrencyWithSymbol(w.scheduledOutflows)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums text-warn-700">
                        {w.gstPayments > 0 ? `−${formatCurrencyWithSymbol(w.gstPayments)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums font-semibold" style={{ color: w.netCash >= 0 ? 'var(--ok-600)' : 'var(--err-600)' }}>
                        {w.netCash >= 0 ? '+' : ''}{formatCurrencyWithSymbol(w.netCash)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums font-bold" style={{ color: w.closingBalance < 0 ? 'var(--err-600)' : 'var(--text)' }}>
                        {formatCurrencyWithSymbol(w.closingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Scenarios */}
        {aiResult && (
          <div className="rounded-xl bg-white p-4 flex flex-col gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Scenario Analysis</h3>
            </div>
            <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>{aiResult.executiveSummary}</p>
            <div className="grid lg:grid-cols-3 gap-3">
              {aiResult.scenarios.map((s) => (
                <div key={s.name} className="rounded-lg p-3 flex flex-col gap-1" style={{ border: '1px solid var(--border-soft)', background: 'var(--surface)' }}>
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{s.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                  <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: s.netImpact >= 0 ? 'var(--ok-600)' : 'var(--err-600)' }}>
                    {s.netImpact >= 0 ? '+' : ''}{formatCurrencyWithSymbol(s.netImpact)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {aiResult.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px]">
                  <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-600 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span style={{ color: 'var(--text-2)' }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WeeklyBarChart({ weeks }: { weeks: import('@/types/cashFlow').CashFlowWeek[] }) {
  if (weeks.length === 0) return null
  const maxBalance = Math.max(...weeks.map((w) => Math.abs(w.closingBalance)), 1)
  const display = weeks.slice(0, 13) // show ~13 weeks (91 days)

  return (
    <div className="flex items-end gap-1 h-32 overflow-x-auto pb-4">
      {display.map((w) => {
        const heightPct = Math.min(100, (Math.abs(w.closingBalance) / maxBalance) * 100)
        const isNeg = w.closingBalance < 0
        return (
          <div key={w.startDate} className="flex flex-col items-center gap-1 min-w-[40px] group relative">
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${heightPct}%`,
                minHeight: 4,
                background: w.isGSTWeek ? 'var(--warn-400)' : isNeg ? 'var(--err-400)' : 'var(--brand-400)',
              }}
            />
            <span className="text-[9px] rotate-45 origin-left" style={{ color: 'var(--text-faint)' }}>{w.weekLabel}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
              {w.weekLabel}: {formatCurrencyWithSymbol(w.closingBalance)}
              {w.isGSTWeek && ' (GST)'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
