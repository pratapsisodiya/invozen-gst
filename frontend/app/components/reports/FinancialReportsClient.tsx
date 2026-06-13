'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useExpenseStore } from '@/lib/store/expenseStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { TopBar } from '../app/TopBar'
import { Tabs } from '../ui/Tabs'
import { generatePLStatement } from '@/lib/reports/plReport'
import { downloadCSV } from '@/lib/export/excelExport'
import { useUIStore } from '@/lib/store/uiStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Download, Sparkles } from 'lucide-react'
import { AIHealthReportModal } from '../ai/AIHealthReportModal'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function FinancialReportsClient() {
  const { invoices } = useInvoiceStore()
  const { purchases } = usePurchaseStore()
  const { expenses } = useExpenseStore()
  const { payments } = usePaymentStore()
  const { addToast } = useUIStore()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [activeTab, setActiveTab] = useState('pl')
  const [showHealthReport, setShowHealthReport] = useState(false)

  const pl = useMemo(() => generatePLStatement(invoices, purchases, expenses, selectedMonth, selectedYear),
    [invoices, purchases, expenses, selectedMonth, selectedYear])

  // Cash flow — last 6 months
  const cashFlow = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(selectedYear, selectedMonth - 1 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const inflow = payments.filter((p) => {
        const pd = new Date(p.paymentDate)
        return pd.getMonth() + 1 === m && pd.getFullYear() === y
      }).reduce((s, p) => s + p.amount, 0)
      const outflow = purchases.filter((p) => {
        const pd = new Date(p.invoiceDate)
        return pd.getMonth() + 1 === m && pd.getFullYear() === y
      }).reduce((s, p) => s + p.grandTotal, 0)
      const expOut = expenses.filter((e) => {
        const ed = new Date(e.date)
        return ed.getMonth() + 1 === m && ed.getFullYear() === y
      }).reduce((s, e) => s + e.totalAmount, 0)
      return { name: MONTHS[m - 1], inflow, outflow: outflow + expOut, net: inflow - outflow - expOut }
    }).reverse()
  }, [payments, purchases, expenses, selectedMonth, selectedYear])

  // Aging receivables
  const aging = useMemo(() => {
    const today = new Date()
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0 }
    for (const inv of invoices) {
      if (!['sent', 'overdue'].includes(inv.status) || inv.balanceDue <= 0) continue
      const due = new Date(inv.dueDate)
      const days = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      if (days <= 0) buckets.current += inv.balanceDue
      else if (days <= 30) buckets.days30 += inv.balanceDue
      else if (days <= 60) buckets.days60 += inv.balanceDue
      else buckets.days90 += inv.balanceDue
    }
    return buckets
  }, [invoices])

  const handleExportPL = () => {
    const rows = [
      ...pl.revenue.map((r) => ({ Section: 'Revenue', Item: r.label, Amount: r.amount })),
      { Section: 'TOTAL REVENUE', Item: '', Amount: pl.totalRevenue },
      ...pl.costOfGoods.map((r) => ({ Section: 'Cost of Goods', Item: r.label, Amount: r.amount })),
      { Section: 'GROSS PROFIT', Item: '', Amount: pl.grossProfit },
      ...pl.expenses.map((r) => ({ Section: 'Expenses', Item: r.label, Amount: r.amount })),
      { Section: 'NET PROFIT', Item: '', Amount: pl.netProfit },
    ]
    downloadCSV(rows, `PL_${MONTHS[selectedMonth - 1]}_${selectedYear}.csv`)
    addToast({ type: 'success', title: 'P&L exported' })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Financial Reports"
        breadcrumb={[{ label: 'Reports', href: '/reports/gstr1' }]}
        actions={
          <div className="flex items-center gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleExportPL} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        }
      />
      <AIHealthReportModal open={showHealthReport} onClose={() => setShowHealthReport(false)} />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        <div className="rounded-xl bg-white p-4 flex items-start justify-between gap-4 flex-wrap" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Financial Health Summary</p>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Turn this month&apos;s revenue, margin, aging, and cash data into an executive summary with risks, opportunities, and action items.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowHealthReport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate summary
            </button>
            <Link
              href="/action-desk"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              View Action Desk
            </Link>
          </div>
        </div>

        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-5 pt-4 pb-0">
            <Tabs tabs={[{ key: 'pl', label: 'P&L Statement' }, { key: 'cashflow', label: 'Cash Flow' }, { key: 'aging', label: 'Aging Receivables' }]}
              activeKey={activeTab} onChange={setActiveTab} />
          </div>

          {activeTab === 'pl' && (
            <div className="p-5 flex flex-col gap-4">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Revenue', value: pl.totalRevenue, color: 'text-brand-700' },
                  { label: 'Gross Profit', value: pl.grossProfit, color: pl.grossProfit >= 0 ? 'text-ok-600' : 'text-err-600' },
                  { label: 'Total Expenses', value: pl.totalExpenses, color: 'text-warn-600' },
                  { label: 'Net Profit', value: pl.netProfit, color: pl.netProfit >= 0 ? 'text-ok-600' : 'text-err-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className={`text-lg font-bold tabular-nums ${color}`}>₹{Math.abs(value).toLocaleString('en-IN')}</p>
                    {label === 'Gross Profit' && <p className="text-xs mt-0.5 text-brand-600">{pl.grossMarginPct}% margin</p>}
                    {label === 'Net Profit' && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{pl.netMarginPct}% margin</p>}
                  </div>
                ))}
              </div>

              {/* P&L Table */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm">
                  <tbody>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={2} className="px-4 py-2.5 text-[11px] font-semibold uppercase text-brand-700">Revenue</td>
                    </tr>
                    {pl.revenue.map((r) => (
                      <tr key={r.label} className="border-t" style={{ borderColor: 'var(--border-soft)' }}>
                        <td className="px-4 py-2.5 pl-8 text-[13px]" style={{ color: r.isNegative ? 'var(--text-muted)' : 'var(--text)' }}>{r.label}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums text-[13px] ${r.isNegative ? 'text-err-600' : ''}`}>
                          {r.isNegative ? '-' : ''}₹{r.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t font-bold" style={{ background: '#f0fdf4', borderColor: 'var(--border)' }}>
                      <td className="px-4 py-2.5 text-[13px] text-ok-700">Total Revenue (Net)</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[13px] text-ok-700">₹{pl.totalRevenue.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                      <td colSpan={2} className="px-4 py-2.5 text-[11px] font-semibold uppercase text-warn-700">Cost of Goods Sold</td>
                    </tr>
                    {pl.costOfGoods.map((r) => (
                      <tr key={r.label} className="border-t" style={{ borderColor: 'var(--border-soft)' }}>
                        <td className="px-4 py-2.5 pl-8 text-[13px]" style={{ color: 'var(--text)' }}>{r.label}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{r.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    <tr className="border-t font-bold" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--text)' }}>Gross Profit</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums text-[13px] ${pl.grossProfit >= 0 ? 'text-ok-600' : 'text-err-600'}`}>₹{pl.grossProfit.toLocaleString('en-IN')}</td>
                    </tr>
                    {pl.expenses.length > 0 && <>
                      <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                        <td colSpan={2} className="px-4 py-2.5 text-[11px] font-semibold uppercase text-err-700">Operating Expenses</td>
                      </tr>
                      {pl.expenses.map((r) => (
                        <tr key={r.label} className="border-t" style={{ borderColor: 'var(--border-soft)' }}>
                          <td className="px-4 py-2.5 pl-8 text-[13px]" style={{ color: 'var(--text)' }}>{r.label}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{r.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </>}
                    <tr className="border-t font-bold text-base" style={{ background: pl.netProfit >= 0 ? '#f0fdf4' : '#fef2f2', borderColor: 'var(--border)' }}>
                      <td className={`px-4 py-3 ${pl.netProfit >= 0 ? 'text-ok-700' : 'text-err-700'}`}>Net Profit / (Loss)</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${pl.netProfit >= 0 ? 'text-ok-700' : 'text-err-700'}`}>₹{pl.netProfit.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'cashflow' && (
            <div className="p-5 flex flex-col gap-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-ok-600" />
                  <p className="text-lg font-bold tabular-nums text-ok-600">₹{cashFlow.reduce((s, m) => s + m.inflow, 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Inflow (6M)</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <TrendingDown className="w-5 h-5 mx-auto mb-1 text-err-600" />
                  <p className="text-lg font-bold tabular-nums text-err-600">₹{cashFlow.reduce((s, m) => s + m.outflow, 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Outflow (6M)</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className={`text-lg font-bold tabular-nums ${cashFlow.reduce((s, m) => s + m.net, 0) >= 0 ? 'text-ok-600' : 'text-err-600'}`}>
                    ₹{Math.abs(cashFlow.reduce((s, m) => s + m.net, 0)).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Net Cash (6M)</p>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlow} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: unknown) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                    <Bar dataKey="inflow" fill="#0d9488" name="Inflow" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outflow" fill="#f87171" name="Outflow" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'aging' && (
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Current (Not Due)', value: aging.current, color: 'text-ok-600' },
                  { label: '1-30 Days Overdue', value: aging.days30, color: 'text-warn-500' },
                  { label: '31-60 Days Overdue', value: aging.days60, color: 'text-warn-700' },
                  { label: '60+ Days Overdue', value: aging.days90, color: 'text-err-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className={`text-lg font-bold tabular-nums ${color}`}>₹{value.toLocaleString('en-IN')}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Total outstanding: ₹{Object.values(aging).reduce((s, v) => s + v, 0).toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
