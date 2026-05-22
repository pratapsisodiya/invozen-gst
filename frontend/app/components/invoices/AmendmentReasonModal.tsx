'use client'
import { useState } from 'react'
import { Modal } from '../ui/Modal'

interface Props {
  open: boolean
  invoiceNumber: string
  onConfirm: (reason: string) => void
  onClose: () => void
}

const AMENDMENT_REASONS = [
  { value: 'Rate difference', label: 'Rate Difference — Incorrect GST rate applied' },
  { value: 'Quantity change', label: 'Quantity Change — Incorrect quantity billed' },
  { value: 'Address correction', label: 'Address Correction — Wrong place of supply' },
  { value: 'GSTIN correction', label: 'GSTIN Correction — Incorrect buyer GSTIN' },
  { value: 'Other', label: 'Other' },
]

export function AmendmentReasonModal({ open, invoiceNumber, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState(AMENDMENT_REASONS[0].value)

  return (
    <Modal open={open} onClose={onClose} title="Amend Invoice" size="sm">
      <div className="p-5 flex flex-col gap-4">
        <div className="p-3 rounded-lg text-xs" style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
          <p className="font-semibold mb-1">GST Amendment</p>
          <p>Invoice <span className="font-mono font-bold">{invoiceNumber}</span> will be marked as <strong>void</strong>. A new amendment invoice with suffix <code>-AMD</code> will be created as a draft. The amendment will appear in GSTR-1 Table 9A.</p>
        </div>

        <div>
          <label className="text-[13px] font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>Reason for Amendment *</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
            style={{ borderColor: 'var(--border)' }}
          >
            {AMENDMENT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
          >
            Create Amendment
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
