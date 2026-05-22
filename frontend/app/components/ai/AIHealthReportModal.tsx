'use client'
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Sparkles, Loader2, Printer, TrendingUp, TrendingDown, AlertTriangle, Zap, CheckCircle, Info } from 'lucide-react'
import type { HealthReportResult } from '@/app/api/ai/health-report/route'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { usePaymentStore } from '@/lib/store/paymentStore'

interface Props {
  open: boolean
  onClose: () => void
}

const STATUS_STYLES = {
  Excellent: { color: 'text-brand-700', bg: 'bg-brand-50', bar: 'bg-brand-500' },
  Good: { color: 'text-teal-700', bg: 'bg-teal-50', bar: 'bg-teal-500' },
  'Needs Attention': { color: 'text-warn-700', bg: 'bg-warn-50', bar: 'bg-warn-500' },
  Critical: { color: 'text-err-700', bg: 'bg-err-50', bar: 'bg-err-500' },
}

const SEVERITY_STYLES = {
  high: { bg: 'bg-err-50', text: 'text-err-700', dot: 'bg-err-500' },
  medium: { bg: 'bg-warn-50', text: 'text-warn-700', dot: 'bg-warn-500' },
  low: { bg: 'bg-ink-50', text: 'text-ink-600', dot: 'bg-ink-400' },
}

const PRIORITY_STYLES = {
  immediate: { bg: 'bg-err-100', text: 'text-err-700' },
  this_week: { bg: 'bg-warn-100', text: 'text-warn-700' },
  this_month: { bg: 'bg-brand-100', text: 'text-brand-700' },
}

export function AIHealthReportModal({ open, onClose }: Props) {
  const { invoices } = useInvoiceStore()
  const { purchases } = usePurchaseStore()
  const { profile } = useBusinessStore()
  const { payments } = usePaymentStore()
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<HealthReportResult | null>(null)
  const [error, setError] = useState('')

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  const getMonthRevenue = (month: number, year: number) =>
    invoices
      .filter((i) => i.status !== 'void' && i.status !== 'draft')
      .filter((i) => { const d = new Date(i.invoiceDate); return d.getMonth() + 1 === month && d.getFullYear() === year })
      .reduce((s, i) => s + i.grandTotal, 0)

  const currentRevenue = getMonthRevenue(currentMonth, currentYear)
  const previousRevenue = getMonthRevenue(prevMonth, prevYear)

  const gstLiability = invoices
    .filter((i) => i.status !== 'void' && i.status !== 'draft')
    .filter((i) => { const d = new Date(i.invoiceDate); return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear })
    .reduce((s, i) => s + i.totalTax, 0)

  const totalITC = purchases
    .filter((p) => p.itcStatus === 'eligible' || p.itcStatus === 'claimed')
    .reduce((s, p) => s + p.itcAvailable, 0)

  const itcUtilizationPct = gstLiability > 0 ? Math.min((totalITC / gstLiability) * 100, 100) : 0

  const overdueInvoices = invoices.filter((i) => i.status === 'overdue')
  const totalOutstanding = invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0)
  const overdueAmount = overdueInvoices.reduce((s, i) => s + i.balanceDue, 0)
  const overdueRatio = totalOutstanding > 0 ? (overdueAmount / totalOutstanding) * 100 : 0

  const totalInvoiced = invoices.filter((i) => i.status !== 'void').reduce((s, i) => s + i.grandTotal, 0)
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const collectionEfficiency = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0

  const customerRevMap: Record<string, number> = {}
  invoices.filter((i) => i.status !== 'void').forEach((i) => {
    customerRevMap[i.customerSnapshot.name] = (customerRevMap[i.customerSnapshot.name] ?? 0) + i.grandTotal
  })
  const topCustomers = Object.entries(customerRevMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, revenue]) => ({ name, revenue }))

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const res = await fetch('/api/ai/health-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: profile.businessName,
          period: `${now.toLocaleString('en-IN', { month: 'long' })} ${currentYear}`,
          revenue: { current: currentRevenue, previous: previousRevenue },
          gstLiability,
          itcUtilizationPct,
          overdueRatio,
          collectionEfficiency,
          topCustomers,
          expenseBreakdown: [],
          invoiceStats: {
            total: invoices.length,
            paid: invoices.filter((i) => i.status === 'paid').length,
            overdue: overdueInvoices.length,
            draft: invoices.filter((i) => i.status === 'draft').length,
          },
          filingCompliance: { onTime: 10, late: 1, pending: 1 },
        }),
      })
      if (!res.ok) throw new Error('AI unavailable')
      const data = await res.json() as HealthReportResult
      setReport(data)
    } catch {
      setError('Could not generate health report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setReport(null)
    setError('')
    onClose()
  }

  const statusCfg = report ? STATUS_STYLES[report.overallStatus] ?? STATUS_STYLES.Good : null

  return (
    <Modal open={open} onClose={handleClose} title="AI Business Health Report" size="lg">
      <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        {!report && !loading && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-brand-600" />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Generate your business health report</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              AI analyzes revenue, GST liability, ITC utilization, collection efficiency, and top customers to generate an executive summary.
            </p>
            <div className="grid grid-cols-3 gap-3 text-left mb-4">
              {[
                { label: 'Revenue (this month)', value: `₹${currentRevenue.toLocaleString('en-IN')}` },
                { label: 'GST Liability', value: `₹${gstLiability.toLocaleString('en-IN')}` },
                { label: 'ITC Utilization', value: `${itcUtilizationPct.toFixed(1)}%` },
                { label: 'Collection Efficiency', value: `${collectionEfficiency.toFixed(1)}%` },
                { label: 'Overdue Ratio', value: `${overdueRatio.toFixed(1)}%` },
                { label: 'Total Invoices', value: invoices.length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg px-3 py-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-err-600 bg-err-50 px-3 py-2 rounded-lg">{error}</p>}

        {loading && (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-500" />
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Generating health report…</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Analyzing business data and GST metrics</p>
          </div>
        )}

        {report && statusCfg && (
          <>
            {/* Overall status */}
            <div className={`rounded-xl p-4 flex items-center gap-4 ${statusCfg.bg}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-lg font-bold ${statusCfg.color}`}>{report.overallStatus}</span>
                  <span className={`text-2xl font-black tabular-nums ${statusCfg.color}`}>{report.healthScore}/100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/60 overflow-hidden">
                  <div className={`h-full rounded-full ${statusCfg.bar}`} style={{ width: `${report.healthScore}%` }} />
                </div>
              </div>
            </div>

            <div className="rounded-lg p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{report.summary}</p>
            </div>

            {/* Risks */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <AlertTriangle className="w-3.5 h-3.5" /> Top Risks
              </h4>
              <div className="flex flex-col gap-2">
                {report.risks.map((r, i) => {
                  const s = SEVERITY_STYLES[r.severity] ?? SEVERITY_STYLES.low
                  return (
                    <div key={i} className={`rounded-lg px-3 py-2.5 ${s.bg}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                        <span className={`text-[13px] font-semibold ${s.text}`}>{r.title}</span>
                      </div>
                      <p className="text-xs ml-3" style={{ color: 'var(--text-muted)' }}>{r.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Opportunities */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <TrendingUp className="w-3.5 h-3.5" /> Opportunities
              </h4>
              <div className="flex flex-col gap-2">
                {report.opportunities.map((o, i) => (
                  <div key={i} className="rounded-lg px-3 py-2.5 bg-brand-50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-brand-700">{o.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{o.description}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-brand-600 whitespace-nowrap">{o.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action items */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Zap className="w-3.5 h-3.5" /> Action Items
              </h4>
              <div className="flex flex-col gap-1.5">
                {report.actionItems.map((a, i) => {
                  const s = PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.this_month
                  return (
                    <div key={i} className="flex items-center gap-2 py-1.5">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-brand-400" />
                      <span className="flex-1 text-[13px]" style={{ color: 'var(--text)' }}>{a.task}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.deadline}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${s.bg} ${s.text}`}>
                          {a.priority.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Insights */}
            {report.insights.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Info className="w-3.5 h-3.5" /> Key Insights
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {report.insights.map((ins, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text)' }}>
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-400 flex-shrink-0" />
                      {ins}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2 px-5 pb-5">
        <button onClick={handleClose} className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
          Close
        </button>
        {report && (
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            <Printer className="w-4 h-4" /> Print
          </button>
        )}
        <button onClick={handleGenerate} disabled={loading}
          className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> {report ? 'Regenerate' : 'Generate Report'}</>}
        </button>
      </div>
    </Modal>
  )
}
