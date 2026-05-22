'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChallanStore } from '@/lib/store/challanStore'
import { useUIStore } from '@/lib/store/uiStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { TopBar } from '../app/TopBar'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { formatDate } from '@/lib/utils/formatters'
import { CHALLAN_TYPE_LABELS, CHALLAN_STATUS_LABELS } from '@/types/challan'
import { downloadChallanPdf } from '@/lib/pdf/challanPdf'
import { FileDown, CheckCircle2, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'

const STATUS_COLORS: Record<string, 'neutral' | 'info' | 'success' | 'warning'> = {
  draft: 'neutral', issued: 'info', returned: 'success', converted: 'warning',
}

export function ChallanDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { getChallanById, issueChallan, markReturned, deleteChallan } = useChallanStore()
  const { addToast } = useUIStore()
  const { profile } = useBusinessStore()
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const challan = getChallanById(id)

  if (!challan) {
    return (
      <div className="flex flex-col flex-1">
        <TopBar title="Challan Not Found" breadcrumb={[{ label: 'Challans', href: '/challans' }]} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Challan not found.</p>
        </div>
      </div>
    )
  }

  const isOverdue = challan.expectedReturnDate && challan.status === 'issued' && challan.expectedReturnDate < new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={challan.challanNumber}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Challans', href: '/challans' }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => downloadChallanPdf(challan, profile)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
              <FileDown className="w-4 h-4" /> Download PDF
            </button>

            {challan.status === 'draft' && (
              <button onClick={() => { issueChallan(id); addToast({ type: 'success', title: 'Challan issued' }) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                <CheckCircle2 className="w-4 h-4" /> Issue
              </button>
            )}
            {challan.status === 'issued' && (
              <button onClick={() => setShowReturnModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
                <RefreshCw className="w-4 h-4" /> Mark Returned
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full flex flex-col gap-5">
        {isOverdue && (
          <div className="flex items-start gap-3 rounded-xl p-3 bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">Expected return date was <strong>{formatDate(challan.expectedReturnDate!)}</strong>. Goods on approval must be returned or converted to invoice within 6 months under CGST Act.</p>
          </div>
        )}

        {/* Header card */}
        <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{challan.challanNumber}</h2>
                <Badge variant={STATUS_COLORS[challan.status]}>{CHALLAN_STATUS_LABELS[challan.status]}</Badge>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{CHALLAN_TYPE_LABELS[challan.challanType]} · {formatDate(challan.challanDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: 'var(--brand-600)' }}>₹{challan.totalValue.toLocaleString('en-IN')}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Value (No GST)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>From (Consignor)</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{challan.fromName}</p>
              {challan.fromGstin && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{challan.fromGstin}</p>}
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{challan.fromAddress}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>To (Consignee)</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{challan.toName}</p>
              {challan.toGstin && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{challan.toGstin}</p>}
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{challan.toAddress}, {challan.toState}</p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Items / Goods</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['#', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Value'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {challan.lineItems.map((item, idx) => (
                <tr key={item.id} className="border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--text)' }}>{item.description}</td>
                  <td className="px-4 py-2.5 text-[13px] font-mono" style={{ color: 'var(--text-muted)' }}>{item.hsnSac || '—'}</td>
                  <td className="px-4 py-2.5 text-[13px] tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>{item.unit}</td>
                  <td className="px-4 py-2.5 text-[13px] tabular-nums">₹{item.rate.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5 text-[13px] font-medium tabular-nums">₹{item.totalValue.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-right font-bold text-sm" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', color: 'var(--brand-600)' }}>
            Total Value: ₹{challan.totalValue.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Transport & metadata */}
        {(challan.transporterName || challan.vehicleNumber || challan.ewayBillNumber) && (
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Transport Details</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {challan.transporterName && <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Transporter</p><p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{challan.transporterName}</p></div>}
              {challan.vehicleNumber && <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Vehicle</p><p className="text-sm font-mono" style={{ color: 'var(--text)' }}>{challan.vehicleNumber}</p></div>}
              {challan.transportMode && <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mode</p><p className="text-sm" style={{ color: 'var(--text)' }}>{challan.transportMode}</p></div>}
              {challan.ewayBillNumber && <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>E-Way Bill</p><p className="text-sm font-mono" style={{ color: 'var(--text)' }}>{challan.ewayBillNumber}</p></div>}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-err-600 hover:bg-err-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Return Modal */}
      <Modal open={showReturnModal} onClose={() => setShowReturnModal(false)} title="Mark as Returned">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Confirm the goods have been returned by the consignee.</p>
          <div>
            <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Actual Return Date</label>
            <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowReturnModal(false)} className="flex-1 h-9 rounded-lg border text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
            <button onClick={() => { markReturned(id, returnDate); setShowReturnModal(false); addToast({ type: 'success', title: 'Marked as returned' }) }}
              className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">Confirm Return</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Challan">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Are you sure you want to delete challan <strong>{challan.challanNumber}</strong>? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-9 rounded-lg border text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
            <button onClick={() => { deleteChallan(id); router.push('/challans'); addToast({ type: 'success', title: 'Challan deleted' }) }}
              className="flex-1 h-9 rounded-lg bg-err-600 hover:bg-err-700 text-white text-sm font-medium">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
