'use client'
import { useState, useMemo } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useExpenseStore } from '@/lib/store/expenseStore'
import { TopBar } from '../app/TopBar'
import { generateGSTComparison } from '@/lib/reports/gstComparison'
import type { ComparisonMode } from '@/lib/reports/gstComparison'
import { downloadCSV } from '@/lib/export/excelExport'
import { TrendingUp, TrendingDown, Minus, Download } from 'lucide-react'
import { BarChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart } from 'recharts'

export function GSTComparisonClient() {
  const { invoices } = useInvoiceStore()
  const { purchases } = usePurchaseStore()
  const { expenses } = useExpenseStore()
  const [mode, setMode] = useState<ComparisonMode>('monthly')
  const [periodCount, setPeriodCount] = useState(6)

  const comparison = useMemo(
    () => generateGSTComparison(invoices, purchases, expenses, periodCount, mode),
    [invoices, purchases, expenses, periodCount, mode]
  )

  const chartData = comparison.periods.map((p) => ({
    name: p.label,
    'Output Tax': p.outputTax,
    'ITC Claimed': p.itcClaimed,
    'Net Payable': p.netPayable,
    Revenue: p.revenue,
  }))

  const handleExport = () => {
    const rows = comparison.periods.map((p) => ({
      Period: p.label,
      Revenue: p.revenue,
      'Output Tax': p.outputTax,
      'ITC Claimed': p.itcClaimed,
      'Net Payable': p.netPayable,
      'Invoice Count': p.invoiceCount,
      'Purchase Count': p.purchaseCount,
    }))
    downloadCSV(rows, `gst-comparison-${mode}.csv`)
  }

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="GST Period Comparison"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'GST Reports', href: '/reports/gstr1' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              {(['monthly', 'quarterly'] as ComparisonMode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${mode === m ? 'bg-brand-600 text-white' : 'hover:bg-ink-50'}`}
                  style={mode !== m ? { color: 'var(--text)' } : {}}>
                  {m === 'monthly' ? 'Monthly' : 'Quarterly'}
                </button>
              ))}
            </div>
            <select value={periodCount} onChange={(e) => setPeriodCount(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <option value={6}>Last 6</option>
              <option value={12}>Last 12</option>
            </select>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* KPI summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Avg Output Tax', value: fmt(comparison.summary.avgOutputTax) },
            { label: 'Avg ITC Claimed', value: fmt(comparison.summary.avgItcClaimed) },
            { label: 'Avg Net Payable', value: fmt(comparison.summary.avgNetPayable) },
            { label: 'ITC Utilization', value: `${comparison.summary.itcUtilizationPct}%` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-lg font-bold text-brand-700 tabular-nums">{value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        {comparison.periods.length > 0 && (
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Tax Trend — Output vs ITC vs Net Payable</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: unknown) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                  <Legend />
                  <Bar dataKey="Output Tax" fill="#0d9488" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="ITC Claimed" fill="#5eead4" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="Net Payable" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Variance table */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Period Variance Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Period', 'Revenue', 'Output Tax', 'vs Prev', 'ITC Claimed', 'vs Prev', 'Net Payable', 'vs Prev', 'Invoices'].map((h, i) => (
                    <th key={`${h}-${i}`} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.periods.map((p, i) => {
                  const v = comparison.variance[i]
                  return (
                    <tr key={p.periodKey} className={`border-t ${v.flagged ? 'bg-amber-50' : ''}`} style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2.5 text-[13px] font-medium" style={{ color: 'var(--text)' }}>{p.label}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{fmt(p.revenue)}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums font-medium" style={{ color: 'var(--text)' }}>{fmt(p.outputTax)}</td>
                      <td className="px-4 py-2.5">
                        <VarianceBadge pct={v.outputTaxChangePct} />
                      </td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--text)' }}>{fmt(p.itcClaimed)}</td>
                      <td className="px-4 py-2.5">
                        <VarianceBadge pct={v.itcChangePct} />
                      </td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums font-semibold" style={{ color: 'var(--brand-600)' }}>{fmt(p.netPayable)}</td>
                      <td className="px-4 py-2.5">
                        <VarianceBadge pct={v.netPayableChangePct} warn={v.flagged} />
                      </td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{p.invoiceCount}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
          Peak period: <strong>{comparison.summary.peakPeriod}</strong> · Lowest period: <strong>{comparison.summary.lowestPeriod}</strong> · Rows flagged amber = &gt;10% variance in net payable
        </p>
      </div>
    </div>
  )
}

function VarianceBadge({ pct, warn }: { pct: number | null; warn?: boolean }) {
  if (pct === null) return <span className="text-xs" style={{ color: 'var(--text-faint)' }}>—</span>
  const color = warn ? 'text-amber-600' : pct > 0 ? 'text-err-600' : pct < 0 ? 'text-green-600' : 'text-gray-400'
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${color}`}>
      <Icon className="w-3 h-3" /> {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}
