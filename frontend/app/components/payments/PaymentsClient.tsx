'use client'
import { useState, useMemo } from 'react'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { SearchBar } from '../ui/SearchBar'
import { KpiCard } from '../ui/KpiCard'
import { Modal } from '../ui/Modal'
import { formatDate } from '@/lib/utils/formatters'
import { generateId } from '@/lib/utils/ids'
import { CheckCircle2, CreditCard, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { PAYMENT_METHOD_LABELS } from '@/types/payment'
import type { PaymentMethod } from '@/types/payment'

export function PaymentsClient() {
  const { payments, addPayment } = usePaymentStore()
  const { invoices, markAsPaid } = useInvoiceStore()
  const { customers, updateCustomer } = useCustomerStore()
  const { addToast } = useUIStore()

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payMethod, setPayMethod] = useState<PaymentMethod>('upi')
  const [payRef, setPayRef] = useState('')
  const [paying, setPaying] = useState(false)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const totalCollectedMTD = useMemo(() =>
    payments.filter((p) => p.paymentDate >= startOfMonth).reduce((s, p) => s + p.amount, 0),
    [payments, startOfMonth]
  )

  const totalDue = useMemo(() =>
    invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0),
    [invoices]
  )

  const totalOverdue = useMemo(() =>
    invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.balanceDue, 0),
    [invoices]
  )

  const expectedThisWeek = useMemo(() => {
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndStr = weekEnd.toISOString().split('T')[0]
    return invoices
      .filter((i) => ['sent', 'overdue'].includes(i.status) && i.dueDate <= weekEndStr)
      .reduce((s, i) => s + i.balanceDue, 0)
  }, [invoices])

  const pendingInvoices = useMemo(() =>
    invoices.filter((i) => ['sent', 'overdue'].includes(i.status)),
    [invoices]
  )

  const filtered = useMemo(() => {
    if (!search) return payments
    const q = search.toLowerCase()
    return payments.filter((p) => {
      const inv = invoices.find((i) => i.id === p.invoiceId)
      const cust = customers.find((c) => c.id === p.customerId)
      return inv?.invoiceNumber.toLowerCase().includes(q) ||
        cust?.name.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q) ||
        PAYMENT_METHOD_LABELS[p.method].toLowerCase().includes(q) ||
        p.amount.toLocaleString('en-IN').includes(q) ||
        String(Math.round(p.amount)).includes(q)
    })
  }, [payments, search, invoices, customers])

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)), [filtered])

  const getCustomerName = (custId: string) => customers.find((c) => c.id === custId)?.name || 'Unknown'
  const getInvoiceNumber = (invId: string) => invoices.find((i) => i.id === invId)?.invoiceNumber || invId

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId)

  const openModal = (invoiceId?: string) => {
    setSelectedInvoiceId(invoiceId || (pendingInvoices[0]?.id || ''))
    setPayAmount('')
    setPayRef('')
    setPayDate(new Date().toISOString().split('T')[0])
    setPayMethod('upi')
    setShowModal(true)
  }

  const handleRecord = () => {
    const inv = invoices.find((i) => i.id === selectedInvoiceId)
    if (!inv) return
    setPaying(true)
    const amount = parseFloat(payAmount) || inv.balanceDue
    setTimeout(() => {
      addPayment({
        id: generateId(),
        invoiceId: inv.id,
        customerId: inv.customerId,
        amount,
        paymentDate: payDate,
        method: payMethod,
        reference: payRef || null,
        notes: null,
        createdAt: new Date().toISOString(),
      })
      markAsPaid(inv.id, amount)
      const cust = customers.find((c) => c.id === inv.customerId)
      if (cust) updateCustomer(inv.customerId, { totalPaid: (cust.totalPaid || 0) + amount })
      setPaying(false)
      setShowModal(false)
      addToast({ type: 'success', title: 'Payment recorded', message: `₹${amount.toLocaleString('en-IN')} from ${getCustomerName(inv.customerId)}` })
    }, 600)
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Payments"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <button onClick={() => openModal()} disabled={pendingInvoices.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <CreditCard className="w-4 h-4" /> Record Payment
          </button>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* KPI bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Total Due" value={totalDue} isAmount subtextColor={totalDue > 0 ? 'warn' : 'default'} />
          <KpiCard title="Overdue" value={totalOverdue} isAmount subtextColor={totalOverdue > 0 ? 'error' : 'default'} />
          <KpiCard title="Collected MTD" value={totalCollectedMTD} isAmount />
          <KpiCard title="Expected This Week" value={expectedThisWeek} isAmount />
        </div>

        {/* Overdue invoices quick actions */}
        {pendingInvoices.filter((i) => i.status === 'overdue').length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--err-50, #fef2f2)', border: '1px solid var(--err-200, #fecaca)' }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-err-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-err-700">
                  {pendingInvoices.filter((i) => i.status === 'overdue').length} overdue {pendingInvoices.filter((i) => i.status === 'overdue').length === 1 ? 'invoice' : 'invoices'}
                </p>
                <p className="text-xs text-err-600 mt-0.5">₹{totalOverdue.toLocaleString('en-IN')} pending collection</p>
              </div>
              <div className="flex gap-2">
                {pendingInvoices.filter((i) => i.status === 'overdue').slice(0, 3).map((inv) => (
                  <button key={inv.id} onClick={() => openModal(inv.id)}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-white border hover:bg-ink-50 transition-colors"
                    style={{ borderColor: 'var(--err-200, #fecaca)', color: 'var(--err-700, #b91c1c)' }}>
                    {inv.invoiceNumber}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payments table */}
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Payment History</h3>
            <SearchBar value={search} onChange={setSearch} placeholder="Search payments..." className="w-56" />
          </div>

          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Customer', 'Invoice', 'Method', 'Reference', 'Amount'].map((h) => (
                    <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${h === 'Amount' ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No payments recorded yet</td></tr>
                ) : sorted.map((p) => (
                  <tr key={p.id} className="h-11 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-2 text-[13px] font-medium" style={{ color: 'var(--text)' }}>{getCustomerName(p.customerId)}</td>
                    <td className="px-4 py-2 font-mono text-[12px] text-brand-600">{getInvoiceNumber(p.invoiceId)}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-ok-50 text-ok-700">
                        {PAYMENT_METHOD_LABELS[p.method]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[13px] font-semibold text-ok-600">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden flex flex-col">
            {sorted.length === 0 && (
              <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No payments recorded yet</div>
            )}
            {sorted.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-ok-50 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-ok-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{getCustomerName(p.customerId)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {getInvoiceNumber(p.invoiceId)} · {PAYMENT_METHOD_LABELS[p.method]} · {formatDate(p.paymentDate)}
                    </p>
                  </div>
                </div>
                <span className="tabular-nums font-semibold text-ok-600">₹{p.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Record payment modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Payment" size="sm">
        <div className="p-5 flex flex-col gap-4">
          {pendingInvoices.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No pending invoices to record payment for.</p>
          ) : (
          <div>
            <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Invoice</label>
            <select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full h-10 rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}>
              {pendingInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {getCustomerName(inv.customerId)} (₹{inv.balanceDue.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>
          )}
          <div>
            <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Amount Received</label>
            <input type="number" value={payAmount || (selectedInvoice?.balanceDue || '')}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full h-10 rounded-lg border px-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-brand-600/20"
              style={{ borderColor: 'var(--border)' }} />
            {selectedInvoice && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Balance due: ₹{selectedInvoice.balanceDue.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <div>
            <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Payment Date</label>
            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
              className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
              style={{ borderColor: 'var(--border)' }} />
          </div>
          <div>
            <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Payment Mode</label>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="w-full h-10 rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Reference / UTR (optional)</label>
            <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Transaction ID"
              className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
              style={{ borderColor: 'var(--border)' }} />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={() => setShowModal(false)}
            className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            Cancel
          </button>
          <button onClick={handleRecord} disabled={paying || !selectedInvoiceId}
            className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {paying ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
