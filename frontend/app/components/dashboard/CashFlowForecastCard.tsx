'use client'
import { useState } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Sparkles, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'

type ForecastDays = 30 | 60 | 90

interface DayForecast {
  date: string
  expectedInflow: number
  netPosition: number
}

interface ForecastResult {
  prediction: DayForecast[]
  insights: string[]
  atRisk: string[]
}

function formatShortDate(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatRs(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

export function CashFlowForecastCard() {
  const { invoices } = useInvoiceStore()
  const { payments } = usePaymentStore()
  const [forecastDays, setForecastDays] = useState<ForecastDays>(30)
  const [result, setResult] = useState<ForecastResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFetch = async (days: ForecastDays) => {
    setForecastDays(days)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices, payments, forecastDays: days }),
      })
      if (!res.ok) throw new Error('Failed to fetch forecast')
      const data = await res.json() as ForecastResult
      setResult(data)
    } catch {
      setError('Could not generate forecast. Check AI configuration.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Cash Flow Forecast</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Day toggle */}
          <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {([30, 60, 90] as ForecastDays[]).map((d) => (
              <button
                key={d}
                onClick={() => void handleFetch(d)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: forecastDays === d && result ? 'white' : 'transparent',
                  color: forecastDays === d && result ? 'var(--brand-600)' : 'var(--text-muted)',
                  boxShadow: forecastDays === d && result ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {d}d
              </button>
            ))}
          </div>
          {!result && !loading && (
            <button
              onClick={() => void handleFetch(forecastDays)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate
            </button>
          )}
        </div>
      </div>

      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Sparkles className="w-8 h-8 text-brand-200" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Click Generate to forecast your cash inflows</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyzing cash flow…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 py-4 px-3 rounded-lg bg-err-50 text-err-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-4">
          {/* Chart */}
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={result.prediction} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatRs} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={46} />
              <Tooltip
                formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name === 'expectedInflow' ? 'Expected Inflow' : 'Net Position']}
                labelFormatter={(d) => formatShortDate(String(d))}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Area type="monotone" dataKey="expectedInflow" stroke="#0d9488" strokeWidth={2} fill="url(#inflowGrad)" dot={false} name="expectedInflow" />
              <Area type="monotone" dataKey="netPosition" stroke="#6366f1" strokeWidth={1.5} fill="url(#netGrad)" dot={false} strokeDasharray="4 2" name="netPosition" />
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-teal-600 rounded inline-block" /> Expected Inflow</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-500 rounded inline-block" style={{ borderTop: '2px dashed #6366f1', background: 'none' }} /> Net Position</span>
          </div>

          {/* Insights */}
          {result.insights.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>AI Insights</p>
              {result.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600 flex-shrink-0 mt-1.5" />
                  {insight}
                </div>
              ))}
            </div>
          )}

          {/* At-risk invoices */}
          {result.atRisk.length > 0 && (
            <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--warn-50, #fffbeb)', border: '1px solid var(--warn-200, #fde68a)' }}>
              <p className="text-xs font-semibold text-warn-700 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> At Risk
              </p>
              {result.atRisk.map((item, i) => (
                <p key={i} className="text-xs text-warn-600">• {item}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
