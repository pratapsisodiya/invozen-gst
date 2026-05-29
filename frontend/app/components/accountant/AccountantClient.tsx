'use client'
import { useState, useMemo } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { KpiCard } from '../ui/KpiCard'
import { formatDate } from '@/lib/utils/formatters'
import { calculateGSTR1Summary } from '@/lib/gst/gstr1'
import { calculateGSTR3BSummary } from '@/lib/gst/gstr3b'
import { Download, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function AccountantClient() {
  const { invoices } = useInvoiceStore()
  const { payments } = usePaymentStore()
  const { customers } = useCustomerStore()
  const { profile } = useBusinessStore()
  const { addToast } = useUIStore()

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [comment, setComment] = useState('')
  const [flags, setFlags] = useState<Array<{ id: string; issue: string; comment: string; resolved: boolean }>>([])

  const period = { month: selectedMonth, year: selectedYear }

  const gstr1 = useMemo(() => calculateGSTR1Summary(invoices, period), [invoices, selectedMonth, selectedYear])
  const gstr3b = useMemo(() => calculateGSTR3BSummary(invoices, [], period), [invoices, selectedMonth, selectedYear])

  const totalRevenue = invoices.filter((i) => !['void', 'draft'].includes(i.status)).reduce((s, i) => s + i.grandTotal, 0)
  const totalTax = invoices.filter((i) => !['void', 'draft'].includes(i.status)).reduce((s, i) => s + i.cgstTotal + i.sgstTotal + i.igstTotal, 0)
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const outstanding = invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0)
  const netTaxPayable = gstr3b.taxLiability.netPayableTotal

  const handleDownload = (type: string) => {
    addToast({ type: 'success', title: `${type} downloaded`, message: `${MONTHS[selectedMonth - 1]} ${selectedYear}` })
  }

  const addFlag = () => {
    if (!comment.trim()) return
    setFlags((prev) => [...prev, { id: Date.now().toString(), issue: comment, comment: '', resolved: false }])
    setComment('')
    addToast({ type: 'success', title: 'Issue flagged' })
  }

  const resolveFlag = (id: string) => {
    setFlags((prev) => prev.map((f) => f.id === id ? { ...f, resolved: true } : f))
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Accountant Portal"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* Read-only banner */}
        <div className="rounded-xl p-3 flex items-center gap-2 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
          <CheckCircle2 className="w-4 h-4 text-ok-600 flex-shrink-0" />
          <span style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text)' }}>Read-only access</strong> — Viewing data for <strong style={{ color: 'var(--text)' }}>{profile.businessName}</strong> · GSTIN: <span className="font-mono">{profile.gstin}</span>
          </span>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Total Revenue" value={totalRevenue} isAmount />
          <KpiCard title="Total GST Collected" value={totalTax} isAmount />
          <KpiCard title="Outstanding" value={outstanding} isAmount subtextColor={outstanding > 0 ? 'warn' : 'default'} />
          <KpiCard title="Net Tax Payable" value={netTaxPayable} isAmount subtextColor={netTaxPayable > 0 ? 'warn' : 'default'} />
        </div>

        {/* Download section */}
        <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Download Reports</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {[
              { label: 'GSTR-1 JSON', desc: `${gstr1.b2b.length} B2B, ${gstr1.b2cs.length} B2C entries`, format: 'gstr1' },
              { label: 'GSTR-3B Excel', desc: `Net payable: ₹${netTaxPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, format: 'gstr3b' },
              { label: 'Tax Summary PDF', desc: `${MONTHS[selectedMonth - 1]} ${selectedYear} complete summary`, format: 'tax_summary' },
              { label: 'Invoice Register', desc: `${invoices.length} invoices with GST breakup`, format: 'invoices' },
              { label: 'Payment Ledger', desc: `${payments.length} payment records`, format: 'payments' },
              { label: 'Customer Ledger', desc: `${customers.length} customers with balances`, format: 'customers' },
            ].map((item) => (
              <button key={item.format}
                onClick={() => handleDownload(item.label)}
                className="flex items-center gap-3 p-4 rounded-xl text-left hover:bg-ink-50 transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Download className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Summary tables */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* GSTR-1 summary */}
          <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>GSTR-1 Summary — {MONTHS[selectedMonth - 1]} {selectedYear}</h3>
            </div>
            <div className="p-4 flex flex-col gap-2 text-sm">
              {[
                { label: 'B2B Supplies', value: `${gstr1.b2b.length} invoices`, amount: gstr1.b2b.reduce((s, e) => s + e.taxableValue, 0) },
                { label: 'B2C Supplies', value: `${gstr1.b2cs.length} entries`, amount: gstr1.b2cs.reduce((s, e) => s + e.taxableValue, 0) },
                { label: 'CDNR (Credit Notes)', value: `${gstr1.cdnr.length} notes`, amount: 0 },
                { label: 'Total Tax (IGST+CGST+SGST)', value: '', amount: gstr1.totals.totalTax },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <div>
                    <span style={{ color: 'var(--text)' }}>{row.label}</span>
                    {row.value && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>({row.value})</span>}
                  </div>
                  <span className="tabular-nums font-medium" style={{ color: 'var(--text)' }}>₹{row.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Issue flags */}
          <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Issue Flags & Comments</h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <input type="text" value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Flag an issue or add a comment..."
                  className="flex-1 h-9 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
                  style={{ borderColor: 'var(--border)' }}
                  onKeyDown={(e) => e.key === 'Enter' && addFlag()} />
                <button onClick={addFlag}
                  className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {flags.length === 0 ? (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>No flags raised</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {flags.map((f) => (
                    <div key={f.id} className={`flex items-start gap-3 p-3 rounded-lg ${f.resolved ? 'opacity-50' : ''}`}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                      {f.resolved
                        ? <CheckCircle2 className="w-4 h-4 text-ok-600 flex-shrink-0 mt-0.5" />
                        : <AlertCircle className="w-4 h-4 text-warn-500 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: 'var(--text)' }}>{f.issue}</p>
                        {f.resolved && <p className="text-[11px] text-ok-600 mt-0.5">Resolved</p>}
                      </div>
                      {!f.resolved && (
                        <button onClick={() => resolveFlag(f.id)}
                          className="text-[11px] px-2 py-0.5 rounded bg-ok-50 text-ok-700 font-medium hover:bg-ok-100 transition-colors flex-shrink-0">
                          Resolve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
