'use client'
import { useState, useMemo, useEffect } from 'react'
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
import { CheckCircle2, CreditCard, AlertCircle, FileDown, Wallet } from 'lucide-react'
import { PAYMENT_METHOD_LABELS } from '@/types/payment'
import type { PaymentMethod } from '@/types/payment'
import { useBusinessStore } from '@/lib/store/businessStore'
import { downloadPaymentReceiptPdf } from '@/lib/pdf/paymentReceipt'
import type { Payment } from '@/types/payment'

export function PaymentsClient() {
  const { payments, addPayment } = usePaymentStore()
  const { invoices, markAsPaid } = useInvoiceStore()
  const { customers, updateCustomer } = useCustomerStore()
  const { addToast } = useUIStore()
  const { profile } = useBusinessStore()

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [allocations, setAllocations] = useState<Record<string, string>>({})
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payMethod, setPayMethod] = useState<PaymentMethod>('upi')
  const [payRef, setPayRef] = useState('')
  const [paying, setPaying] = useState(false)

  // Advance payment modal state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [advCustomerId, setAdvCustomerId] = useState('')
  const [advAmount, setAdvAmount] = useState('')
  const [advDate, setAdvDate] = useState(new Date().toISOString().split('T')[0])
  const [advMethod, setAdvMethod] = useState<PaymentMethod>('upi')
  const [advRef, setAdvRef] = useState('')
  const [savingAdv, setSavingAdv] = useState(false)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const totalCollectedMTD = useMemo(() =>
    payments.filter((p) => p.paymentDate >= startOfMonth && !p.isAdvance).reduce((s, p) => s + p.amount, 0),
    [payments, startOfMonth]
  )

  const totalAdvancesHeld = useMemo(() =>
    payments.filter((p) => p.isAdvance && !p.advanceAdjustedInvoiceId).reduce((s, p) => s + p.amount, 0),
    [payments]
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

  const customersWithOutstanding = useMemo(() => {
    const ids = new Set(pendingInvoices.map((i) => i.customerId))
    return customers.filter((c) => ids.has(c.id))
  }, [customers, pendingInvoices])

  const invoicesForSelectedCustomer = useMemo(() =>
    pendingInvoices.filter((i) => i.customerId === selectedCustomerId),
    [pendingInvoices, selectedCustomerId]
  )

  useEffect(() => {
    const newAllocs: Record<string, string> = {}
    invoicesForSelectedCustomer.forEach((inv) => {
      newAllocs[inv.id] = String(inv.balanceDue.toFixed(2))
    })
    setAllocations(newAllocs)
  }, [selectedCustomerId])

  const allocationTotal = useMemo(() =>
    Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [allocations]
  )

  const allocatedCount = useMemo(() =>
    Object.values(allocations).filter((v) => parseFloat(v) > 0).length,
    [allocations]
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

  const handleDownloadReceipt = async (p: Payment) => {
    if (p.isAdvance) { addToast({ type: 'info', title: 'No receipt for advance payments' }); return }
    const inv = p.invoiceId ? invoices.find((i) => i.id === p.invoiceId) : undefined
    const cust = customers.find((c) => c.id === p.customerId)
    if (!inv || !cust) { addToast({ type: 'error', title: 'Could not generate receipt' }); return }
    const year = new Date(p.paymentDate).getFullYear()
    const receiptNumber = `RCP-${year}-${p.id.slice(-4).toUpperCase()}`
    try {
      await downloadPaymentReceiptPdf(p, [inv], cust, profile, receiptNumber)
      addToast({ type: 'success', title: 'Receipt downloaded', message: receiptNumber })
    } catch (err) {
      console.error('[PaymentsClient] Receipt PDF error:', err)
      addToast({ type: 'error', title: 'Could not generate receipt' })
    }
  }

  const openModal = (invoiceId?: string) => {
    const custId = invoiceId
      ? invoices.find((i) => i.id === invoiceId)?.customerId || ''
      : customersWithOutstanding[0]?.id || ''
    setSelectedCustomerId(custId)
    setPayRef('')
    setPayDate(new Date().toISOString().split('T')[0])
    setPayMethod('upi')
    setShowModal(true)
  }

  const handleRecordAdvance = async () => {
    const amt = parseFloat(advAmount)
    if (!advCustomerId || !amt || amt <= 0) return
    setSavingAdv(true)
    await addPayment({
      id: generateId(),
      invoiceId: null,
      customerId: advCustomerId,
      amount: amt,
      paymentDate: advDate,
      method: advMethod,
      reference: advRef || null,
      notes: null,
      isAdvance: true,
      advanceAdjustedInvoiceId: null,
      createdAt: new Date().toISOString(),
    })
    setSavingAdv(false)
    setShowAdvanceModal(false)
    setAdvAmount('')
    setAdvRef('')
    addToast({ type: 'success', title: 'Advance payment recorded', message: `₹${amt.toLocaleString('en-IN')} advance held` })
  }

  const handleRecord = async () => {
    if (!selectedCustomerId || allocatedCount === 0) return
    setPaying(true)
    const toRecord = invoicesForSelectedCustomer.filter((inv) => {
      const amt = parseFloat(allocations[inv.id] || '0')
      return amt > 0
    })
    for (const inv of toRecord) {
      const amount = parseFloat(allocations[inv.id])
      addPayment({
        id: generateId(),
        invoiceId: inv.id,
        customerId: inv.customerId,
        amount,
        paymentDate: payDate,
        method: payMethod,
        reference: payRef || null,
        notes: null,
        isAdvance: false,
        advanceAdjustedInvoiceId: null,
        createdAt: new Date().toISOString(),
      })
      markAsPaid(inv.id, amount)
    }
    const cust = customers.find((c) => c.id === selectedCustomerId)
    if (cust) updateCustomer(selectedCustomerId, { totalPaid: (cust.totalPaid || 0) + allocationTotal })
    setPaying(false)
    setShowModal(false)
    addToast({
      type: 'success',
      title: 'Payment recorded',
      message: `₹${allocationTotal.toLocaleString('en-IN')} across ${toRecord.length} invoice${toRecord.length !== 1 ? 's' : ''}`,
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Payments"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setAdvCustomerId(customers[0]?.id || ''); setShowAdvanceModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <Wallet className="w-4 h-4" /> Record Advance
            </button>
            <button onClick={() => openModal()} disabled={pendingInvoices.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <CreditCard className="w-4 h-4" /> Record Payment
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* KPI bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard title="Total Due" value={totalDue} isAmount subtextColor={totalDue > 0 ? 'warn' : 'default'} />
          <KpiCard title="Overdue" value={totalOverdue} isAmount subtextColor={totalOverdue > 0 ? 'error' : 'default'} />
          <KpiCard title="Collected MTD" value={totalCollectedMTD} isAmount />
          <KpiCard title="Expected This Week" value={expectedThisWeek} isAmount />
          <KpiCard title="Advances Held" value={totalAdvancesHeld} isAmount subtextColor={totalAdvancesHeld > 0 ? 'warn' : 'default'} />
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
                  {['Date', 'Customer', 'Invoice', 'Method', 'Reference', 'Amount', ''].map((h) => (
                    <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${h === 'Amount' ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No payments recorded yet</td></tr>
                ) : sorted.map((p) => (
                  <tr key={p.id} className="h-11 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-2 text-[13px] font-medium" style={{ color: 'var(--text)' }}>{getCustomerName(p.customerId)}</td>
                    <td className="px-4 py-2 font-mono text-[12px] text-brand-600">
                      {p.isAdvance
                        ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">ADV</span>
                        : p.invoiceId ? getInvoiceNumber(p.invoiceId) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-ok-50 text-ok-700">
                        {PAYMENT_METHOD_LABELS[p.method]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[13px] font-semibold text-ok-600">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => void handleDownloadReceipt(p)} title="Download Receipt"
                        className="p-1.5 rounded hover:bg-ink-100 transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
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
                      {p.isAdvance ? 'Advance' : p.invoiceId ? getInvoiceNumber(p.invoiceId) : '—'} · {PAYMENT_METHOD_LABELS[p.method]} · {formatDate(p.paymentDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-semibold text-ok-600">₹{p.amount.toLocaleString('en-IN')}</span>
                  <button onClick={() => void handleDownloadReceipt(p)} title="Download Receipt"
                    className="p-1.5 rounded hover:bg-ink-100 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <FileDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advance payment modal */}
      <Modal open={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} title="Record Advance Payment" size="md">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Record a pre-invoice advance received from a customer. It will appear as unallocated until applied to an invoice.</p>
          <div>
            <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Customer</label>
            <select value={advCustomerId} onChange={(e) => setAdvCustomerId(e.target.value)}
              className="w-full h-10 rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Amount (₹)</label>
              <input type="number" min="0" step="0.01" value={advAmount} onChange={(e) => setAdvAmount(e.target.value)}
                placeholder="0.00" className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
                style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Date</label>
              <input type="date" value={advDate} onChange={(e) => setAdvDate(e.target.value)}
                className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
                style={{ borderColor: 'var(--border)' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Payment Mode</label>
              <select value={advMethod} onChange={(e) => setAdvMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 rounded-lg border px-3 text-sm outline-none"
                style={{ borderColor: 'var(--border)' }}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Reference / UTR</label>
              <input type="text" value={advRef} onChange={(e) => setAdvRef(e.target.value)} placeholder="Optional"
                className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
                style={{ borderColor: 'var(--border)' }} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={() => setShowAdvanceModal(false)}
            className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
          <button onClick={() => void handleRecordAdvance()} disabled={savingAdv || !advAmount || parseFloat(advAmount) <= 0}
            className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {savingAdv ? 'Saving...' : 'Record Advance'}
          </button>
        </div>
      </Modal>

      {/* Record payment modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Payment" size="lg">
        <div className="p-5 flex flex-col gap-4">
          {customersWithOutstanding.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No pending invoices to record payment for.</p>
          ) : (
            <>
              {/* Step 1: Customer */}
              <div>
                <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Customer</label>
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full h-10 rounded-lg border px-3 text-sm outline-none"
                  style={{ borderColor: 'var(--border)' }}>
                  {customersWithOutstanding.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Invoice allocations */}
              {invoicesForSelectedCustomer.length > 0 && (
                <div>
                  <label className="text-[13px] font-medium mb-2 block" style={{ color: 'var(--text-2)' }}>Allocate to Invoices</label>
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                          <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Invoice</th>
                          <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Balance Due</th>
                          <th className="px-3 py-2 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Amount to Allocate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoicesForSelectedCustomer.map((inv, i) => (
                          <tr key={inv.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                            <td className="px-3 py-2">
                              <span className="font-mono text-brand-600">{inv.invoiceNumber}</span>
                              <span className="ml-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>Due {formatDate(inv.dueDate)}</span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium" style={{ color: 'var(--text)' }}>
                              ₹{inv.balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                max={inv.balanceDue}
                                step="0.01"
                                value={allocations[inv.id] ?? ''}
                                onChange={(e) => setAllocations((prev) => ({ ...prev, [inv.id]: e.target.value }))}
                                className="w-28 h-7 rounded border px-2 text-right tabular-nums outline-none focus:ring-1 focus:ring-brand-600/20 focus:border-brand-600"
                                style={{ borderColor: 'var(--border)' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between text-xs mt-1.5 px-1">
                    <span style={{ color: 'var(--text-muted)' }}>{allocatedCount} invoice{allocatedCount !== 1 ? 's' : ''} selected</span>
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>
                      Total: ₹{allocationTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Common fields */}
              <div className="grid grid-cols-3 gap-3">
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
                  <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Reference / UTR</label>
                  <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Optional"
                    className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
                    style={{ borderColor: 'var(--border)' }} />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={() => setShowModal(false)}
            className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            Cancel
          </button>
          <button onClick={() => void handleRecord()} disabled={paying || allocatedCount === 0}
            className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {paying ? 'Recording...' : `Record ₹${allocationTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          </button>
        </div>
      </Modal>
    </div>
  )
}
