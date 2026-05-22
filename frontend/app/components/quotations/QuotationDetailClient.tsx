'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuotationStore } from '@/lib/store/quotationStore'
import { useUIStore } from '@/lib/store/uiStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { TopBar } from '../app/TopBar'
import { AmountDisplay } from '../ui/AmountDisplay'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatDate } from '@/lib/utils/formatters'
import { Send, CheckCircle, XCircle, FileCheck, Trash2, ExternalLink, FileDown, MessageCircle } from 'lucide-react'
import type { QuotationStatus } from '@/types/quotation'
import { downloadQuotationPdf } from '@/lib/pdf/quotationPdf'

const STATUS_COLORS: Record<QuotationStatus, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#6B7280' },
  sent: { bg: '#EEF2FF', text: '#4F46E5' },
  accepted: { bg: '#ECFDF5', text: '#059669' },
  rejected: { bg: '#FEF2F2', text: '#DC2626' },
  expired: { bg: '#FFF7ED', text: '#EA580C' },
  converted: { bg: '#F0FDF4', text: '#16A34A' },
}

export function QuotationDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { quotations, markSent, markAccepted, markRejected, convertToInvoice, deleteQuotation } = useQuotationStore()
  const { addToast } = useUIStore()
  const { profile } = useBusinessStore()
  const { customers } = useCustomerStore()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const q = quotations.find((x) => x.id === id)
  if (!q) return (
    <div className="flex flex-col flex-1">
      <TopBar title="Quotation Not Found" breadcrumb={[{ label: 'Quotations', href: '/quotations' }]} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: 'var(--text-muted)' }}>Quotation not found.</p></div>
    </div>
  )

  const sc = STATUS_COLORS[q.status]

  const handleConvert = () => {
    const invoiceId = convertToInvoice(id)
    if (invoiceId) { addToast({ type: 'success', title: 'Converted to invoice' }); router.push(`/invoices/${invoiceId}`) }
    else addToast({ type: 'error', title: 'Could not convert' })
  }

  const handleWhatsApp = () => {
    const cust = customers.find((c) => c.id === q!.customerId)
    const phone = cust?.phone
    if (!phone) { addToast({ type: 'error', title: 'No phone number for this customer' }); return }
    const msg = `Dear ${q!.customerSnapshot.name},\n\nPlease find our quotation *${q!.quotationNumber}* for ₹${q!.grandTotal.toLocaleString('en-IN')}.\n\nValid until: ${formatDate(q!.validUntil)}\n\n— ${profile?.businessName ?? ''}`
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={q.quotationNumber}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Quotations', href: '/quotations' }]}
        actions={
          <div className="flex gap-2 no-print flex-wrap">
            {profile && (
              <button onClick={() => void downloadQuotationPdf(q, profile)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                <FileDown className="w-4 h-4" /> PDF
              </button>
            )}
            <button onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            {q.status === 'draft' && (
              <button onClick={() => { markSent(id); addToast({ type: 'success', title: 'Marked as sent' }) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                <Send className="w-4 h-4" /> Mark Sent
              </button>
            )}
            {(q.status === 'draft' || q.status === 'sent') && (
              <>
                <button onClick={() => { markAccepted(id); addToast({ type: 'success', title: 'Marked as accepted' }) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
                  <CheckCircle className="w-4 h-4" /> Accept
                </button>
                <button onClick={() => { markRejected(id); addToast({ type: 'success', title: 'Marked as rejected' }) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </>
            )}
            {(q.status === 'accepted' || q.status === 'sent') && (
              <button onClick={handleConvert}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                <FileCheck className="w-4 h-4" /> Convert to Invoice
              </button>
            )}
            <button onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-err-600 hover:bg-err-50 text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--border)' }}>
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full flex flex-col gap-4">
        {/* Converted banner */}
        {q.status === 'converted' && q.convertedToInvoiceId && (
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
            <p className="text-sm font-medium text-green-800">
              Converted to Invoice <span className="font-mono">{q.convertedToInvoiceNumber}</span>
            </p>
            <button onClick={() => router.push(`/invoices/${q.convertedToInvoiceId}`)}
              className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 font-medium">
              <ExternalLink className="w-3.5 h-3.5" /> View Invoice
            </button>
          </div>
        )}

        {/* Header card */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Customer</p>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>{q.customerSnapshot.name}</p>
              {q.customerSnapshot.gstin && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{q.customerSnapshot.gstin}</p>}
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{q.customerSnapshot.state}</p>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{q.status}</span>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Date: {formatDate(q.quotationDate)}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Valid until: <span className="font-medium">{formatDate(q.validUntil)}</span></p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl bg-white p-4 overflow-x-auto" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Line Items</h3>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Description', 'HSN/SAC', 'Qty', 'Rate', 'Disc%', 'GST%', 'Taxable', 'Total'].map((h) => (
                  <th key={h} className="pb-2 text-left text-[11px] font-semibold uppercase pr-3" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.lineItems.map((li) => (
                <tr key={li.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{li.description}</td>
                  <td className="py-2 pr-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{li.hsnSac}</td>
                  <td className="py-2 pr-3" style={{ color: 'var(--text-2)' }}>{li.quantity} {li.unit}</td>
                  <td className="py-2 pr-3"><AmountDisplay amount={li.rate} /></td>
                  <td className="py-2 pr-3 text-xs" style={{ color: 'var(--text-2)' }}>{li.discountPercent > 0 ? `${li.discountPercent}%` : '—'}</td>
                  <td className="py-2 pr-3 text-xs" style={{ color: 'var(--text-2)' }}>{li.gstRate}%</td>
                  <td className="py-2 pr-3"><AmountDisplay amount={li.taxableValue} /></td>
                  <td className="py-2 font-medium"><AmountDisplay amount={li.totalAmount} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="rounded-xl bg-white p-4 w-full max-w-xs" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            {[
              { label: 'Subtotal', value: q.subtotal },
              q.discountAmount > 0 ? { label: 'Discount', value: q.discountAmount } : null,
              { label: 'Taxable Value', value: q.taxableValue },
              q.supplyType === 'intra' ? { label: 'CGST', value: q.cgstTotal } : null,
              q.supplyType === 'intra' ? { label: 'SGST', value: q.sgstTotal } : null,
              q.supplyType === 'inter' ? { label: 'IGST', value: q.igstTotal } : null,
              { label: 'Grand Total', value: q.grandTotal, bold: true },
            ].filter((x): x is NonNullable<typeof x> => x !== null).map(({ label, value, bold }) => (
              <div key={label} className={`flex justify-between py-1.5 ${bold ? 'border-t mt-1 pt-2.5' : ''}`} style={bold ? { borderColor: 'var(--border)' } : {}}>
                <span className="text-sm" style={{ color: bold ? 'var(--text)' : 'var(--text-2)', fontWeight: bold ? 600 : undefined }}>{label}</span>
                <AmountDisplay amount={value ?? 0} className={`text-sm ${bold ? 'font-bold text-base' : ''}`} />
              </div>
            ))}
          </div>
        </div>

        {(q.notes || q.terms) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {q.notes && (
              <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>NOTES</p>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>{q.notes}</p>
              </div>
            )}
            {q.terms && (
              <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>TERMS</p>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>{q.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Quotation"
        message="This quotation will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { deleteQuotation(id); addToast({ type: 'success', title: 'Quotation deleted' }); router.push('/quotations') }}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  )
}
