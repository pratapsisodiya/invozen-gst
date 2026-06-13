'use client'
import { useRouter } from 'next/navigation'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { AmountDisplay } from '../ui/AmountDisplay'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatDate } from '@/lib/utils/formatters'
import { useState } from 'react'
import { CheckCircle, Trash2, FileDown } from 'lucide-react'
import type { ItcStatus, PurchaseStatus } from '@/types/purchase'
import { useBusinessStore } from '@/lib/store/businessStore'
import { downloadPurchaseOrderPdf } from '@/lib/pdf/purchaseOrderPdf'
import { AIPDFAssistModal } from '../ai/AIPDFAssistModal'
import { Sparkles } from 'lucide-react'

const STATUS_COLORS: Record<PurchaseStatus, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#6B7280' },
  recorded: { bg: '#EEF2FF', text: '#4F46E5' },
  claimed: { bg: '#ECFDF5', text: '#059669' },
  rejected: { bg: '#FEF2F2', text: '#DC2626' },
}
const ITC_COLORS: Record<ItcStatus, { bg: string; text: string }> = {
  eligible: { bg: '#EEF2FF', text: '#4F46E5' },
  ineligible: { bg: '#F3F4F6', text: '#6B7280' },
  blocked: { bg: '#FEF2F2', text: '#DC2626' },
  claimed: { bg: '#ECFDF5', text: '#059669' },
  reversed: { bg: '#FFF7ED', text: '#EA580C' },
}

export function PurchaseDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { purchases, claimItc, deletePurchase } = usePurchaseStore()
  const { addToast } = useUIStore()
  const { profile } = useBusinessStore()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)

  const purchase = purchases.find((p) => p.id === id)
  if (!purchase) return (
    <div className="flex flex-col flex-1">
      <TopBar title="Purchase Not Found" breadcrumb={[{ label: 'Purchases', href: '/purchases' }]} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: 'var(--text-muted)' }}>Purchase not found.</p></div>
    </div>
  )

  const sc = STATUS_COLORS[purchase.status]
  const ic = ITC_COLORS[purchase.itcStatus]

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={purchase.purchaseNumber}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Purchases', href: '/purchases' }]}
        actions={
          <div className="flex gap-2 no-print">
            {profile && (
              <button onClick={() => void downloadPurchaseOrderPdf(purchase, profile)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                <FileDown className="w-4 h-4" /> PDF
              </button>
            )}
            <button onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-brand-50"
              style={{ border: '1px solid var(--brand-200)', color: 'var(--brand-700)' }}>
              <Sparkles className="w-4 h-4" /> AI Review
            </button>
            {purchase.itcStatus === 'eligible' && (
              <button onClick={() => { claimItc(purchase.id); addToast({ type: 'success', title: 'ITC claimed' }) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                <CheckCircle className="w-4 h-4" /> Claim ITC
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
        {/* Header card */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Vendor</p>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>{purchase.vendorSnapshot.name}</p>
              {purchase.vendorSnapshot.gstin && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{purchase.vendorSnapshot.gstin}</p>}
            </div>
            <div className="text-right">
              <div className="flex gap-2 justify-end mb-1">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{purchase.status}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: ic.bg, color: ic.text }}>{purchase.itcStatus}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Vendor Invoice: <span className="font-mono">{purchase.vendorInvoiceNumber}</span></p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Date: {formatDate(purchase.invoiceDate)}</p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl bg-white p-4 overflow-x-auto" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Line Items</h3>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Description', 'HSN/SAC', 'Qty', 'Rate', 'Taxable', 'GST', 'Total', 'ITC'].map((h) => (
                  <th key={h} className="pb-2 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)', paddingRight: '12px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchase.lineItems.map((li) => (
                <tr key={li.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{li.description}</td>
                  <td className="py-2 pr-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{li.hsnSac}</td>
                  <td className="py-2 pr-3 text-right" style={{ color: 'var(--text-2)' }}>{li.quantity} {li.unit}</td>
                  <td className="py-2 pr-3 text-right" style={{ color: 'var(--text-2)' }}><AmountDisplay amount={li.rate} /></td>
                  <td className="py-2 pr-3 text-right" style={{ color: 'var(--text-2)' }}><AmountDisplay amount={li.taxableValue} /></td>
                  <td className="py-2 pr-3 text-right" style={{ color: 'var(--text-2)' }}><AmountDisplay amount={li.cgst + li.sgst + li.igst} /></td>
                  <td className="py-2 pr-3 text-right font-medium" style={{ color: 'var(--text)' }}><AmountDisplay amount={li.totalAmount} /></td>
                  <td className="py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${li.itcEligible ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {li.itcEligible ? 'Eligible' : 'Blocked'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="rounded-xl bg-white p-4 w-full max-w-xs" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            {[
              { label: 'Taxable Value', value: purchase.taxableValue },
              purchase.supplyType === 'intra' ? { label: 'CGST', value: purchase.cgstTotal } : null,
              purchase.supplyType === 'intra' ? { label: 'SGST', value: purchase.sgstTotal } : null,
              purchase.supplyType === 'inter' ? { label: 'IGST', value: purchase.igstTotal } : null,
              { label: 'Total Tax', value: purchase.totalTax },
              { label: 'Grand Total', value: purchase.grandTotal, bold: true },
              { label: 'ITC Available', value: purchase.itcAvailable, color: '#4F46E5' },
              { label: 'ITC Claimed', value: purchase.itcClaimed, color: '#059669' },
            ].filter((x): x is NonNullable<typeof x> => x !== null).map(({ label, value, bold, color }) => (
              <div key={label} className={`flex justify-between py-1.5 ${bold ? 'border-t mt-1 pt-2.5' : ''}`} style={bold ? { borderColor: 'var(--border)' } : {}}>
                <span className="text-sm" style={{ color: color || (bold ? 'var(--text)' : 'var(--text-2)'), fontWeight: bold ? 600 : undefined }}>{label}</span>
                <span style={{ color: color || undefined }}><AmountDisplay amount={value ?? 0} className={`text-sm ${bold ? 'font-bold text-base' : ''}`} /></span>
              </div>
            ))}
          </div>
        </div>

        {purchase.notes && (
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>NOTES</p>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{purchase.notes}</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Purchase"
        message="This purchase record will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { deletePurchase(purchase.id); addToast({ type: 'success', title: 'Purchase deleted' }); router.push('/purchases') }}
        onClose={() => setDeleteOpen(false)}
      />

      <AIPDFAssistModal 
        open={showAIModal} 
        onClose={() => setShowAIModal(false)} 
        purchase={purchase} 
        profile={profile} 
      />
    </div>
  )
}
