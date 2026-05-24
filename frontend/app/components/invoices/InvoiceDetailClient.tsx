'use client'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { useState, useEffect, useCallback } from 'react'
import { Edit, Download, Send, CreditCard, CheckCircle2, Truck, MessageSquareWarning, Copy, Loader2, AlertCircle } from 'lucide-react'
import { PAYMENT_METHOD_LABELS } from '@/types/payment'
import type { PaymentMethod } from '@/types/payment'
import { downloadInvoicePdf } from '@/lib/pdf/invoicePdf'
import { downloadPaymentReceiptPdf } from '@/lib/pdf/paymentReceipt'
import { calculateLateInterest } from '@/lib/gst/latePaymentInterest'
import { AmendmentReasonModal } from './AmendmentReasonModal'
import { EWayBillClient } from '../einvoice/EWayBillClient'
import { FileAttachment } from '../ui/FileAttachment'
import { useAttachmentStore } from '@/lib/store/attachmentStore'

export function InvoiceDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { invoices, markAsSent, markAsPaid, createAmendment } = useInvoiceStore()
  const { payments, addPayment, getUnallocatedAdvances, markAdvanceUsed } = usePaymentStore()
  const { customers, updateCustomer } = useCustomerStore()
  const { profile } = useBusinessStore()
  const { addToast } = useUIStore()
  const { getAttachments, setAttachments } = useAttachmentStore()
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payMethod, setPayMethod] = useState<PaymentMethod>('upi')
  const [payRef, setPayRef] = useState('')
  const [paying, setPaying] = useState(false)
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)
  const [showReceiptPrompt, setShowReceiptPrompt] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputedAmount, setDisputedAmount] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)
  const [disputeResult, setDisputeResult] = useState<{ letterText: string; keyPoints: string[]; interestCalculation: number; suggestedResolution: string } | null>(null)
  const [useAdvanceId, setUseAdvanceId] = useState<string | null>(null)
  const [showAmendModal, setShowAmendModal] = useState(false)

  const invoice = invoices.find((i) => i.id === id)

  const handleSendEmailEarly = useCallback(async () => {
    const inv = invoices.find((i) => i.id === id)
    if (!inv) return
    const cust = customers.find((c) => c.id === inv.customerId)
    const email = cust?.email
    if (!email) { addToast({ type: 'error', title: 'No email address for this customer' }); return }
    try {
      const res = await fetch(`/api/invoices/${inv.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email }),
      })
      const data = await res.json() as { sent?: boolean; reason?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Send failed')
      markAsSent(inv.id)
      addToast({ type: 'success', title: data.sent ? `Email sent to ${email}` : 'Marked as sent', message: data.reason })
    } catch (err) {
      addToast({ type: 'error', title: 'Could not send email', message: String(err) })
    }
  }, [id, invoices, customers, addToast, markAsSent])

  // Auto-trigger send email if navigated with ?action=send
  useEffect(() => {
    if (searchParams.get('action') === 'send' && invoice) {
      handleSendEmailEarly()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, invoice?.id])

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

  const unallocatedAdvances = getUnallocatedAdvances(invoice.customerId)

  const handleRecordPayment = () => {
    setPaying(true)
    const amount = parseFloat(payAmount) || invoice.balanceDue
    const newPaymentId = generateId()
    addPayment({
      id: newPaymentId,
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      amount,
      paymentDate: payDate,
      method: payMethod,
      reference: payRef || null,
      notes: null,
      isAdvance: false,
      advanceAdjustedInvoiceId: null,
      createdAt: new Date().toISOString(),
    })
    if (useAdvanceId) {
      markAdvanceUsed(useAdvanceId, invoice.id)
      setUseAdvanceId(null)
    }
    markAsPaid(invoice.id, amount)
    const cust = customers.find((c) => c.id === invoice.customerId)
    if (cust) {
      updateCustomer(invoice.customerId, { totalPaid: (cust.totalPaid ?? 0) + amount })
    } else {
      addToast({ type: 'error', title: 'Customer record not found — payment still recorded' })
    }
    setPaying(false)
    setShowPayModal(false)
    setLastPaymentId(newPaymentId)
    setShowReceiptPrompt(true)
    addToast({ type: 'success', title: 'Payment recorded', message: `₹${amount.toLocaleString('en-IN')} recorded` })
  }

  const handleDownloadReceipt = async () => {
    if (!lastPaymentId) return
    const payment = payments.find((p) => p.id === lastPaymentId) ?? {
      id: lastPaymentId,
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      amount: parseFloat(payAmount) || invoice.balanceDue,
      paymentDate: payDate,
      method: payMethod,
      reference: payRef || null,
      notes: null,
      isAdvance: false,
      advanceAdjustedInvoiceId: null,
      createdAt: new Date().toISOString(),
    }
    const cust = customers.find((c) => c.id === invoice.customerId)
    if (!cust) { addToast({ type: 'error', title: 'Customer not found' }); return }
    const year = new Date(payDate).getFullYear()
    const receiptNumber = `RCP-${year}-${lastPaymentId.slice(-4).toUpperCase()}`
    try {
      await downloadPaymentReceiptPdf(payment, [invoice], cust, profile, receiptNumber)
      addToast({ type: 'success', title: 'Receipt downloaded', message: receiptNumber })
    } catch (err) {
      console.error('[InvoiceDetailClient] Receipt PDF error:', err)
      addToast({ type: 'error', title: 'Could not generate receipt' })
    }
    setShowReceiptPrompt(false)
  }

  const handleMarkAsSent = () => {
    markAsSent(invoice.id)
    addToast({ type: 'success', title: 'Invoice marked as sent', message: invoice.invoiceNumber })
  }

  const handleGenerateDispute = async () => {
    if (!disputeReason.trim()) return
    setDisputeLoading(true)
    try {
      const res = await fetch('/api/ai/dispute-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice,
          disputeReason,
          disputedAmount: parseFloat(disputedAmount) || invoice.balanceDue,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as { letterText: string; keyPoints: string[]; interestCalculation: number; suggestedResolution: string }
      setDisputeResult(data)
    } catch {
      addToast({ type: 'error', title: 'Could not generate dispute letter' })
    } finally {
      setDisputeLoading(false)
    }
  }

  const handleCopyLetter = () => {
    if (!disputeResult) return
    void navigator.clipboard.writeText(disputeResult.letterText)
    addToast({ type: 'success', title: 'Letter copied to clipboard' })
  }

  const handleDownloadLetter = () => {
    if (!disputeResult) return
    const blob = new Blob([disputeResult.letterText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Dispute_${invoice.invoiceNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleWhatsApp = () => {
    const custObj = customers.find((c) => c.id === invoice.customerId)
    const phone = custObj?.phone?.replace(/\D/g, '') || ''
    if (!phone) { addToast({ type: 'error', title: 'No phone number for this customer' }); return }
    const msg = encodeURIComponent(
      `Dear ${invoice.customerSnapshot.name},\n\nThis is a reminder from *${profile.businessName}*.\n\n📄 *Invoice:* ${invoice.invoiceNumber}\n💰 *Amount Due:* ₹${invoice.balanceDue.toLocaleString('en-IN')}\n📅 *Due Date:* ${formatDate(invoice.dueDate)}\n\nKindly arrange payment at the earliest. Thank you! 🙏`
    )
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank')
  }

  const handleDownloadPdf = async () => {
    try {
      const { settings } = await import('@/lib/store/businessStore').then((m) => m.useBusinessStore.getState())
      await downloadInvoicePdf(invoice, profile, settings)
      addToast({ type: 'success', title: 'PDF downloaded', message: invoice.invoiceNumber })
    } catch (err) {
      addToast({ type: 'error', title: 'PDF generation failed', message: 'Please try again' })
    }
  }

  const handleSendEmail = async () => {
    const cust = customers.find((c) => c.id === invoice!.customerId)
    const email = cust?.email
    if (!email) { addToast({ type: 'error', title: 'No email address for this customer' }); return }
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email }),
      })
      const data = await res.json() as { sent?: boolean; reason?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Send failed')
      markAsSent(invoice.id)
      addToast({ type: 'success', title: data.sent ? `Email sent to ${email}` : 'Marked as sent', message: data.reason })
    } catch (err) {
      addToast({ type: 'error', title: 'Could not send email', message: String(err) })
    }
  }
  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={invoice.invoiceNumber}
        breadcrumb={[{ label: 'Invoices', href: '/invoices' }]}
        actions={
          <div className="flex items-center gap-2 no-print">
            <button onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Print
            </button>
            {invoice.status === 'draft' && (
              <>
                <Link href={`/invoices/${id}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Link>
                <button onClick={handleSendEmail}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <Send className="w-3.5 h-3.5" /> Send Email
                </button>
                <button onClick={handleMarkAsSent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                  <Send className="w-3.5 h-3.5" /> Mark as Sent
                </button>
              </>
            )}
            {['sent', 'overdue', 'paid'].includes(invoice.status) && !invoice.amendedInvoiceId && (
              <button onClick={() => setShowAmendModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                <Edit className="w-3.5 h-3.5" /> Amend
              </button>
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
                {invoice.status === 'overdue' && (
                  <button onClick={() => { setDisputeResult(null); setDisputeReason(''); setDisputedAmount(String(invoice.balanceDue)); setShowDisputeModal(true) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                    <MessageSquareWarning className="w-3.5 h-3.5 text-warn-600" /> Dispute Response
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
          {/* Amendment reference banner */}
          {invoice.amendedInvoiceId && (
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700">
                <span className="font-semibold">Amendment</span> — This invoice amends #{invoice.amendedInvoiceNumber}. Reason: {invoice.amendmentReason}. It will appear in GSTR-1 Table 9A.
              </p>
            </div>
          )}

          {/* Late interest notice */}
          {invoice.status === 'overdue' && invoice.balanceDue > 0 && (() => {
            const interest = calculateLateInterest(invoice.balanceDue, invoice.dueDate)
            return interest > 0 ? (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}>
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  <span className="font-semibold">Interest Accrued (CGST Act §50):</span> ₹{interest.toLocaleString('en-IN', { maximumFractionDigits: 2 })} at 18% p.a. on overdue balance of ₹{invoice.balanceDue.toLocaleString('en-IN')}
                </p>
              </div>
            ) : null
          })()}

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
            <div className="flex justify-end px-4 sm:px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="w-full sm:w-64 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Taxable Value</span><span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{invoice.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                {intra ? (
                  <>
                    <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>CGST</span><span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{invoice.cgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>SGST</span><span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{invoice.sgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                  </>
                ) : (
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>IGST</span><span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{invoice.igstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                )}
                {(invoice.cessTotal ?? 0) > 0 && (
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Cess</span><span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{(invoice.cessTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                )}
                {invoice.tdsAmount && invoice.tdsAmount > 0 && (
                  <div className="flex justify-between text-err-600"><span>Less: TDS ({invoice.tdsSection})</span><span className="tabular-nums">−₹{invoice.tdsAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                )}
                <div className="flex justify-between font-bold text-base pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)' }}>{invoice.tdsAmount ? 'Net Payable' : 'Total'}</span>
                  <span className="tabular-nums text-brand-700">₹{(invoice.tdsAmount ? invoice.grandTotal - invoice.tdsAmount : invoice.grandTotal).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>{formatAmountInWords(invoice.grandTotal)}</p>
              </div>
            </div>
          </div>

          {/* E-Way Bill — show for invoices with goods > ₹50K */}
          {invoice.grandTotal >= 50000 && invoice.lineItems.some((li) => li.hsnSac && !li.hsnSac.startsWith('99')) && (
            <EWayBillClient invoice={invoice} />
          )}

          {/* Attachments */}
          <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <FileAttachment
              attachments={getAttachments(invoice.id)}
              onChange={(atts) => setAttachments(invoice.id, atts)}
            />
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

      {/* Dispute Response Modal */}
      <Modal open={showDisputeModal} onClose={() => setShowDisputeModal(false)} title="Generate Dispute Response" size="lg">
        <div className="p-5 flex flex-col gap-4">
          {!disputeResult ? (
            <>
              <div>
                <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Dispute Reason</label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe the dispute (e.g. Services not delivered, goods returned, quality issues...)"
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 resize-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
              <div>
                <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Disputed Amount (₹)</label>
                <input
                  type="number"
                  value={disputedAmount}
                  onChange={(e) => setDisputedAmount(e.target.value)}
                  className="w-full h-10 rounded-lg border px-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-brand-600/20"
                  style={{ borderColor: 'var(--border)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Balance due: ₹{invoice.balanceDue.toLocaleString('en-IN')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowDisputeModal(false)}
                  className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  Cancel
                </button>
                <button
                  onClick={() => void handleGenerateDispute()}
                  disabled={disputeLoading || !disputeReason.trim()}
                  className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {disputeLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : 'Generate Letter'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Key points */}
              {disputeResult.keyPoints.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Key Points</p>
                  {disputeResult.keyPoints.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-600 flex-shrink-0 mt-1.5" />
                      {pt}
                    </div>
                  ))}
                </div>
              )}

              {disputeResult.interestCalculation > 0 && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--warn-50, #fffbeb)', border: '1px solid var(--warn-200, #fde68a)' }}>
                  <span className="text-warn-700 font-medium">Interest Accrued (18% p.a.)</span>
                  <span className="tabular-nums font-bold text-warn-700">₹{disputeResult.interestCalculation.toLocaleString('en-IN')}</span>
                </div>
              )}

              {/* Letter text */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Dispute Letter</p>
                <textarea
                  readOnly
                  value={disputeResult.letterText}
                  rows={10}
                  className="w-full rounded-lg border px-3 py-2 text-xs font-mono outline-none resize-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                />
              </div>

              {disputeResult.suggestedResolution && (
                <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                  Suggested resolution: {disputeResult.suggestedResolution}
                </p>
              )}

              <div className="flex gap-2">
                <button onClick={() => setDisputeResult(null)}
                  className="h-10 px-4 rounded-lg border text-sm font-medium hover:bg-ink-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  ← Regenerate
                </button>
                <button onClick={handleCopyLetter}
                  className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50 flex items-center justify-center gap-1.5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <Copy className="w-3.5 h-3.5" /> Copy Letter
                </button>
                <button onClick={handleDownloadLetter}
                  className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download .txt
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Receipt download prompt */}
      <Modal open={showReceiptPrompt} onClose={() => setShowReceiptPrompt(false)} title="Payment Recorded" size="sm">
        <div className="p-5 flex flex-col gap-3">
          <p className="text-sm" style={{ color: 'var(--text)' }}>Payment successfully recorded. Would you like to download a receipt?</p>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setShowReceiptPrompt(false)}
              className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Skip
            </button>
            <button onClick={() => void handleDownloadReceipt()}
              className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
              <Download className="w-4 h-4" /> Download Receipt
            </button>
          </div>
        </div>
      </Modal>

      {/* Record payment modal */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment" size="sm">
        <div className="p-5 flex flex-col gap-4">
          {unallocatedAdvances.length > 0 && (
            <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <p className="text-xs font-semibold text-amber-700">Advance Payments Available</p>
              {unallocatedAdvances.map((adv) => (
                <label key={adv.id} className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="text-amber-800">
                    ₹{adv.amount.toLocaleString('en-IN')} · {formatDate(adv.paymentDate)} · {PAYMENT_METHOD_LABELS[adv.method]}
                  </span>
                  <input type="radio" name="useAdvance" value={adv.id}
                    checked={useAdvanceId === adv.id}
                    onChange={() => { setUseAdvanceId(adv.id); setPayAmount(String(adv.amount)) }}
                    className="accent-amber-600"
                  />
                </label>
              ))}
              {useAdvanceId && (
                <button onClick={() => { setUseAdvanceId(null); setPayAmount('') }}
                  className="text-[11px] text-amber-700 underline text-left">Clear selection</button>
              )}
            </div>
          )}
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

      {/* Amendment reason modal */}
      <AmendmentReasonModal
        open={showAmendModal}
        invoiceNumber={invoice.invoiceNumber}
        onClose={() => setShowAmendModal(false)}
        onConfirm={(reason) => {
          setShowAmendModal(false)
          const newId = createAmendment(invoice.id, reason)
          if (newId) {
            addToast({ type: 'success', title: 'Amendment created', message: `${invoice.invoiceNumber}-AMD` })
            router.push(`/invoices/${newId}/edit`)
          }
        }}
      />
    </div>
  )
}
