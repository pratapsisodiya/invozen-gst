'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { StatusBadge } from '../ui/Badge'
import { AmountDisplay } from '../ui/AmountDisplay'
import { Modal } from '../ui/Modal'
import { formatDate } from '@/lib/utils/formatters'
import { formatAmountInWords } from '@/lib/gst/formatter'
import { generateId } from '@/lib/utils/ids'
import { useState } from 'react'
import { Edit, Download, Send, CreditCard, CheckCircle2 } from 'lucide-react'
import { PAYMENT_METHOD_LABELS } from '@/types/payment'
import type { PaymentMethod } from '@/types/payment'

export function InvoiceDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { invoices, markAsSent, markAsPaid } = useInvoiceStore()
  const { payments, addPayment } = usePaymentStore()
  const { customers, updateCustomer } = useCustomerStore()
  const { profile } = useBusinessStore()
  const { addToast } = useUIStore()
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payMethod, setPayMethod] = useState<PaymentMethod>('upi')
  const [payRef, setPayRef] = useState('')
  const [paying, setPaying] = useState(false)

  const invoice = invoices.find((i) => i.id === id)

  if (!invoice) {
    return (
      <div className="flex flex-col flex-1">
        <TopBar title="Invoice Not Found" breadcrumb={[{ label: 'Invoices', href: '/invoices' }]} />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Invoice #{id} not found.</p>
            <Link href="/invoices" className="text-brand-600 hover:text-brand-700 text-sm font-medium">← Back to invoices</Link>
          </div>
        </div>
      </div>
    )
  }

  const invoicePayments = payments.filter((p) => p.invoiceId === id)
  const intra = invoice.supplyType === 'intra'

  const handleRecordPayment = () => {
    setPaying(true)
    const amount = parseFloat(payAmount) || invoice.balanceDue
    setTimeout(() => {
      addPayment({
        id: generateId(),
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount,
        paymentDate: payDate,
        method: payMethod,
        reference: payRef || null,
        notes: null,
        createdAt: new Date().toISOString(),
      })
      markAsPaid(invoice.id, amount)
      const cust = customers.find((c) => c.id === invoice.customerId)
      if (cust) updateCustomer(invoice.customerId, { totalPaid: (cust.totalPaid || 0) + amount })
      setPaying(false)
      setShowPayModal(false)
      addToast({ type: 'success', title: 'Payment recorded', message: `₹${amount.toLocaleString('en-IN')} recorded` })
    }, 600)
  }

  const handleMarkAsSent = () => {
    markAsSent(invoice.id)
    addToast({ type: 'success', title: 'Invoice marked as sent', message: invoice.invoiceNumber })
  }

  const handleWhatsApp = () => {
    const rawPhone = invoice.customerSnapshot.name
    const custObj = customers.find((c) => c.id === invoice.customerId)
    const phone = custObj?.phone?.replace(/\D/g, '') || ''
    if (!phone) { addToast({ type: 'error', title: 'No phone number for this customer' }); return }
    const msg = encodeURIComponent(
      `Hi ${invoice.customerSnapshot.name}, your invoice ${invoice.invoiceNumber} for ₹${invoice.grandTotal.toLocaleString('en-IN')} is due on ${formatDate(invoice.dueDate)}. Please arrange payment. Thank you.`
    )
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank')
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={invoice.invoiceNumber}
        breadcrumb={[{ label: 'Invoices', href: '/invoices' }]}
        actions={
          <div className="flex items-center gap-2 no-print">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Download className="w-3.5 h-3.5" /> Print / PDF
            </button>
            {invoice.status === 'draft' && (
              <>
                <Link href={`/invoices/${id}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Link>
                <button onClick={handleMarkAsSent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                  <Send className="w-3.5 h-3.5" /> Mark as Sent
                </button>
              </>
            )}
            {['sent', 'overdue'].includes(invoice.status) && (
              <>
                {customers.find((c) => c.id === invoice.customerId)?.phone && (
                  <button onClick={handleWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                    WhatsApp
                  </button>
                )}
                <button onClick={() => setShowPayModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                  <CreditCard className="w-3.5 h-3.5" /> Record Payment
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-5">
          {/* Header card */}
          <div className="rounded-xl bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold font-mono" style={{ color: 'var(--text)' }}>{invoice.invoiceNumber}</h2>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {formatDate(invoice.invoiceDate)} · Due {formatDate(invoice.dueDate)} · {invoice.supplyType === 'intra' ? 'Intra-state' : 'Inter-state'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-brand-700">₹{invoice.grandTotal.toLocaleString('en-IN')}</p>
              {invoice.balanceDue > 0 && invoice.balanceDue < invoice.grandTotal && (
                <p className="text-sm text-warn-600 tabular-nums">Balance: ₹{invoice.balanceDue.toLocaleString('en-IN')}</p>
              )}
            </div>
          </div>

          {/* Bill from / Bill to */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                label: 'Bill From',
                name: profile.businessName,
                gstin: profile.gstin || 'Unregistered',
                addr: `${profile.billingAddress.city}, ${profile.billingAddress.state}`,
              },
              {
                label: 'Bill To',
                name: invoice.customerSnapshot.name,
                gstin: invoice.customerSnapshot.gstin || 'Unregistered',
                addr: invoice.customerSnapshot.state,
              },
            ].map((party) => (
              <div key={party.label} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{party.label}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{party.name}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{party.gstin}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{party.addr}</p>
              </div>
            ))}
          </div>

          {/* Line items */}
          <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Taxable', ...(intra ? ['CGST', 'SGST'] : ['IGST']), 'Total'].map((h) => (
                      <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${['Rate', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'].includes(h) ? 'text-right' : 'text-left'}`}
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((li, i) => (
                    <tr key={li.id} className="h-11 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td className="px-4 py-2">
                        <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{li.description}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{li.unit} · GST {li.gstRate}%</p>
                      </td>
                      <td className="px-4 py-2 text-[13px] font-mono" style={{ color: 'var(--text-muted)' }}>{li.hsnSac}</td>
                      <td className="px-4 py-2 text-[13px] tabular-nums" style={{ color: 'var(--text)' }}>{li.quantity}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{li.rate.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{li.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      {intra ? (
                        <>
                          <td className="px-4 py-2 text-right tabular-nums text-[13px]" style={{ color: 'var(--text-muted)' }}>₹{li.cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-[13px]" style={{ color: 'var(--text-muted)' }}>₹{li.sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        </>
                      ) : (
                        <td className="px-4 py-2 text-right tabular-nums text-[13px]" style={{ color: 'var(--text-muted)' }}>₹{li.igst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      )}
                      <td className="px-4 py-2 text-right tabular-nums text-[13px] font-semibold" style={{ color: 'var(--text)' }}>₹{li.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totals */}
            <div className="flex justify-end px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="w-64 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Taxable Value</span><span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{invoice.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                {intra ? (
                  <>
                    <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>CGST</span><span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{invoice.cgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>SGST</span><span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{invoice.sgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                  </>
                ) : (
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>IGST</span><span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{invoice.igstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                )}
                <div className="flex justify-between font-bold text-base pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)' }}>Total</span>
                  <span className="tabular-nums text-brand-700">₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>{formatAmountInWords(invoice.grandTotal)}</p>
              </div>
            </div>
          </div>

          {/* Payment history */}
          {invoicePayments.length > 0 && (
            <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Payment History</h3>
              </div>
              <div className="flex flex-col">
                {invoicePayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-ok-600" />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{PAYMENT_METHOD_LABELS[p.method]}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(p.paymentDate)}{p.reference && ` · ${p.reference}`}</p>
                      </div>
                    </div>
                    <span className="tabular-nums font-semibold text-ok-600">₹{p.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record payment modal */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment" size="sm">
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Amount Received</label>
            <input type="number" value={payAmount || invoice.balanceDue}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full h-10 rounded-lg border px-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-brand-600/20"
              style={{ borderColor: 'var(--border)' }} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Balance due: ₹{invoice.balanceDue.toLocaleString('en-IN')}</p>
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
          <button onClick={() => setShowPayModal(false)} className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
          <button onClick={handleRecordPayment} disabled={paying}
            className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {paying ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
