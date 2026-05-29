'use client'
import { useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { KpiCard } from '../ui/KpiCard'
import { StatusBadge } from '../ui/Badge'
import { TopBar } from '../app/TopBar'
import { AmountDisplay } from '../ui/AmountDisplay'
import { formatDate } from '@/lib/utils/formatters'
import { Plus, Users, BarChart2, Bell, FileText, TrendingUp, ShoppingCart, CheckCircle, Clock, AlertTriangle, Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { RevenueChart } from './RevenueChart'
import { TopCustomersCard } from './TopCustomersCard'
import { CAPriorityBoard } from './CAPriorityBoard'
import { AIHealthReportModal } from '../ai/AIHealthReportModal'
import { AgingReportCard } from '../customers/AgingReportCard'
import { CashFlowForecastCard } from './CashFlowForecastCard'
import { ITCOptimizerCard } from './ITCOptimizerCard'
import { AnomalyDetectorCard } from './AnomalyDetectorCard'
import { AIDailyBriefingCard } from './AIDailyBriefingCard'
import { MONTH_NAMES } from '@/lib/gst/constants'

export function DashboardClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')
  const clientName = searchParams.get('clientName') ? decodeURIComponent(searchParams.get('clientName')!) : null

  const { invoices } = useInvoiceStore()
  const { customers } = useCustomerStore()
  const { getItcSummary } = usePurchaseStore()
  const [showHealthReport, setShowHealthReport] = useState(false)

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const goToPrevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear((y) => y - 1) }
    else setSelectedMonth((m) => m - 1)
  }
  const goToNextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear((y) => y + 1) }
    else setSelectedMonth((m) => m + 1)
  }
  const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()

  const stats = useMemo(() => {
    const thisMonth = invoices.filter((inv) => {
      const d = new Date(inv.invoiceDate)
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && inv.status !== 'void'
    })
    const paid = thisMonth.filter((i) => i.status === 'paid')
    const revenue = paid.reduce((s, i) => s + i.grandTotal, 0)
    const gstCollected = paid.reduce((s, i) => s + i.totalTax, 0)
    const cgstCollected = paid.reduce((s, i) => s + i.cgstTotal, 0)
    const sgstCollected = paid.reduce((s, i) => s + i.sgstTotal, 0)
    const outstanding = invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0)
    const overdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.balanceDue, 0)
    const overdueCount = invoices.filter((i) => i.status === 'overdue').length
    const sentCount = invoices.filter((i) => i.status === 'sent').length
    return { revenue, gstCollected, cgstCollected, sgstCollected, outstanding, overdue, overdueCount, sentCount, invoiceCount: thisMonth.length }
  }, [invoices, selectedMonth, selectedYear])

  const recentInvoices = useMemo(() =>
    [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [invoices]
  )

  const aging = useMemo(() => {
    // Use start-of-day in local timezone to avoid UTC midnight off-by-one errors
    const todayMs = new Date(new Date().toLocaleDateString('en-CA')).getTime()
    const agingInvoices = invoices.filter((i) => ['sent', 'overdue'].includes(i.status) && i.balanceDue > 0)
    return {
      current: agingInvoices.filter((i) => new Date(i.dueDate).getTime() >= todayMs).reduce((s, i) => s + i.balanceDue, 0),
      late30: agingInvoices.filter((i) => {
        const days = Math.floor((todayMs - new Date(i.dueDate).getTime()) / 86400000)
        return days > 0 && days <= 30
      }).reduce((s, i) => s + i.balanceDue, 0),
      late60plus: agingInvoices.filter((i) => {
        const days = Math.floor((todayMs - new Date(i.dueDate).getTime()) / 86400000)
        return days > 30
      }).reduce((s, i) => s + i.balanceDue, 0),
    }
  }, [invoices])

  const dueSoon = useMemo(() => {
    const today = new Date()
    return invoices
      .filter((i) => ['sent', 'overdue'].includes(i.status))
      .map((i) => ({ ...i, daysUntilDue: Math.ceil((new Date(i.dueDate).getTime() - today.getTime()) / 86400000) }))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 4)
  }, [invoices])

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Dashboard"
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Month navigator */}
            <div className="flex items-center gap-1 rounded-lg border px-1" style={{ borderColor: 'var(--border)' }}>
              <button onClick={goToPrevMonth} className="p-1 rounded hover:bg-ink-50 transition-colors" aria-label="Previous month">
                <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              </button>
              <span className="text-xs font-medium px-1 tabular-nums" style={{ color: 'var(--text)', minWidth: 64, textAlign: 'center' }}>
                {MONTH_NAMES[selectedMonth - 1].slice(0, 3)} {selectedYear}
              </span>
              <button onClick={goToNextMonth} className="p-1 rounded hover:bg-ink-50 transition-colors" aria-label="Next month" disabled={isCurrentMonth}>
                <ChevronRight className={`w-3.5 h-3.5 ${isCurrentMonth ? 'opacity-30' : ''}`} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            {!isCurrentMonth && (
              <button onClick={() => { setSelectedMonth(now.getMonth() + 1); setSelectedYear(now.getFullYear()) }}
                className="px-2 py-1.5 rounded-lg border text-xs font-medium hover:bg-ink-50 transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Today
              </button>
            )}
            <button onClick={() => setShowHealthReport(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Sparkles className="w-4 h-4 text-brand-600" /> <span className="hidden sm:inline">Health Report</span>
            </button>
            <Link href="/invoices/new" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Invoice</span>
            </Link>
          </div>
        }
      />
      <AIHealthReportModal open={showHealthReport} onClose={() => setShowHealthReport(false)} />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-6">
        {/* CA Client View Banner */}
        {clientId && clientName && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-800 min-w-0">
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">Viewing: <strong>{clientName}</strong></span>
            </div>
            <button onClick={() => router.push('/ca-dashboard')}
              className="shrink-0 flex items-center gap-1 text-amber-700 hover:text-amber-900 text-xs font-semibold">
              <X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exit Client View</span><span className="sm:hidden">Exit</span>
            </button>
          </div>
        )}


        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title={`Revenue (${MONTH_NAMES[selectedMonth - 1].slice(0, 3)} ${selectedYear})`}
            value={stats.revenue}
            isAmount
            subtext={`${stats.invoiceCount} invoices`}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <KpiCard
            title="Outstanding Amount"
            value={stats.outstanding}
            isAmount
            subtext={`${stats.sentCount} invoices due`}
            subtextColor="warn"
            icon={<FileText className="w-4 h-4" />}
          />
          <KpiCard
            title="Overdue Amount"
            value={stats.overdue}
            isAmount
            subtext={`${stats.overdueCount} invoices overdue`}
            subtextColor="error"
          />
          <KpiCard
            title="GST Collected (MTD)"
            value={stats.gstCollected}
            isAmount
            subtext={`CGST ₹${(stats.cgstCollected).toFixed(0)} + SGST ₹${(stats.sgstCollected).toFixed(0)}`}
          />
        </div>

        {/* Aging Summary */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <KpiCard title="Not Yet Due" value={aging.current} isAmount />
          <KpiCard title="1–30 Days Overdue" value={aging.late30} isAmount subtextColor={aging.late30 > 0 ? 'warn' : 'default'} />
          <KpiCard title="30+ Days Overdue" value={aging.late60plus} isAmount subtextColor={aging.late60plus > 0 ? 'error' : 'default'} />
        </div>

        {/* ITC Summary */}
        {(() => {
          const itc = getItcSummary()
          const netTaxPayable = Math.max(0, stats.gstCollected - itc.claimed)
          return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard title="Total ITC Available" value={itc.available} isAmount icon={<ShoppingCart className="w-4 h-4" />} subtext="From purchases" />
              <KpiCard title="ITC Claimed" value={itc.claimed} isAmount icon={<CheckCircle className="w-4 h-4" />} />
              <KpiCard title="Pending ITC" value={itc.pending} isAmount icon={<Clock className="w-4 h-4" />} subtextColor={itc.pending > 0 ? 'warn' : 'default'} subtext="Eligible, not claimed" />
              <KpiCard title="Net GST Payable" value={netTaxPayable} isAmount subtext="Collected minus claimed" />
            </div>
          )
        })()}


        {/* Aging Report */}
        <AgingReportCard />

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Link href="/invoices/new" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
          <Link href="/customers/new" className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-ink-50 text-sm font-medium transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            <Users className="w-4 h-4" /> New Customer
          </Link>
          <Link href="/reports/gstr1" className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-ink-50 text-sm font-medium transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            <BarChart2 className="w-4 h-4" /> GSTR Summary
          </Link>
          <Link href="/reminders" className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-ink-50 text-sm font-medium transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            <Bell className="w-4 h-4" /> Send Reminders
          </Link>
        </div>

        <CAPriorityBoard />


        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Revenue — Last 6 Months</h3>
            <RevenueChart
              invoices={invoices}
              onBarClick={(m, y) => { setSelectedMonth(m); setSelectedYear(y) }}
            />
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Payment Timeline</h3>
            <div className="flex flex-col gap-2">
              {dueSoon.length === 0
                ? <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No pending payments</p>
                : dueSoon.map((inv) => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-ink-50 transition-colors" style={{ border: '1px solid var(--border-soft)' }}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{inv.customerSnapshot.name}</p>
                      <p className="text-[11px]" style={{ color: inv.daysUntilDue < 0 ? 'var(--err-600)' : inv.daysUntilDue <= 1 ? 'var(--warn-600)' : 'var(--text-muted)' }}>
                        {inv.daysUntilDue < 0 ? `${Math.abs(inv.daysUntilDue)}d overdue` : inv.daysUntilDue === 0 ? 'Due today' : `Due in ${inv.daysUntilDue}d`}
                      </p>
                    </div>
                    <AmountDisplay amount={inv.balanceDue} size="sm" color={inv.daysUntilDue < 0 ? 'error' : 'default'} />
                  </Link>
                ))
              }
            </div>
            {dueSoon.length > 0 && (
              <Link href="/reminders" className="mt-3 flex items-center justify-center w-full py-2 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors border" style={{ borderColor: 'var(--border)' }}>
                Send all reminders →
              </Link>
            )}
          </div>
        </div>

        {/* AI Daily Briefing */}
        <AIDailyBriefingCard />

        {/* Cash Flow Forecast */}
        <CashFlowForecastCard />

        {/* AI Cards — ITC Optimizer + Anomaly Detector */}
        <div className="grid lg:grid-cols-2 gap-4">
          <ITCOptimizerCard />
          <AnomalyDetectorCard />
        </div>

        {/* Recent invoices + top customers */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Recent Invoices</h3>
              <Link href="/invoices" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Invoice No.</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Customer</th>
                    <th className="hidden sm:table-cell px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Amount</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="h-11 border-t hover:bg-ink-50/50 transition-colors cursor-pointer" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2">
                        <Link href={`/invoices/${inv.id}`} className="text-brand-600 hover:text-brand-700 font-mono text-[13px]">{inv.invoiceNumber}</Link>
                      </td>
                      <td className="px-4 py-2 text-[13px] max-w-[120px] truncate" style={{ color: 'var(--text)' }}>{inv.customerSnapshot.name}</td>
                      <td className="hidden sm:table-cell px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.invoiceDate, 'd MMM')}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>
                        ₹{inv.grandTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-2"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <TopCustomersCard customers={customers} invoices={invoices} />
        </div>
      </div>
    </div>
  )
}
