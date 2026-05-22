'use client'
import { useState, useMemo } from 'react'
import { useITCReversalStore } from '@/lib/store/itcReversalStore'
import { useUIStore } from '@/lib/store/uiStore'
import { generateId } from '@/lib/utils/ids'
import { TopBar } from '../app/TopBar'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { formatDate } from '@/lib/utils/formatters'
import { ITC_REVERSAL_REASON_LABELS } from '@/types/itcReversal'
import type { ITCReversalReason } from '@/types/itcReversal'
import { Plus, FileMinus, CheckCircle2 } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ITCReversalListClient() {
  const { reversals, filter, setFilter, getFilteredReversals, getMonthlyAggregate, addReversal, markAsReported, getUnreportedCount } = useITCReversalStore()
  const { addToast } = useUIStore()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({
    vendorName: '',
    purchaseInvoiceNumber: '',
    originalInvoiceDate: '',
    reason: 'non_payment_180_days' as ITCReversalReason,
    reasonNotes: '',
    cgstReversed: '',
    sgstReversed: '',
    igstReversed: '',
    cessReversed: '',
    notes: '',
  })

  const monthAggregate = useMemo(() => getMonthlyAggregate(selectedMonth, selectedYear), [reversals, selectedMonth, selectedYear])
  const filtered = getFilteredReversals()
  const unreportedCount = getUnreportedCount()

  const handleAdd = () => {
    if (!form.vendorName.trim()) { addToast({ type: 'error', title: 'Vendor name is required' }); return }
    const cgst = parseFloat(form.cgstReversed) || 0
    const sgst = parseFloat(form.sgstReversed) || 0
    const igst = parseFloat(form.igstReversed) || 0
    const cess = parseFloat(form.cessReversed) || 0
    if (cgst + sgst + igst + cess <= 0) { addToast({ type: 'error', title: 'Enter at least one reversal amount' }); return }

    addReversal({
      id: generateId(),
      reversalDate: new Date().toISOString().split('T')[0],
      purchaseId: null,
      purchaseInvoiceNumber: form.purchaseInvoiceNumber || null,
      vendorName: form.vendorName.trim(),
      vendorGstin: null,
      originalInvoiceDate: form.originalInvoiceDate || null,
      reason: form.reason,
      reasonNotes: form.reasonNotes.trim(),
      cgstReversed: Math.round(cgst * 100) / 100,
      sgstReversed: Math.round(sgst * 100) / 100,
      igstReversed: Math.round(igst * 100) / 100,
      cessReversed: Math.round(cess * 100) / 100,
      totalReversed: Math.round((cgst + sgst + igst + cess) * 100) / 100,
      gstr3bPeriod: null,
      isReported: false,
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setShowAddModal(false)
    setForm({ vendorName: '', purchaseInvoiceNumber: '', originalInvoiceDate: '', reason: 'non_payment_180_days', reasonNotes: '', cgstReversed: '', sgstReversed: '', igstReversed: '', cessReversed: '', notes: '' })
    addToast({ type: 'success', title: 'ITC reversal recorded' })
  }

  const handleMarkReported = () => {
    const unreported = filtered.filter((r) => !r.isReported).map((r) => r.id)
    if (!unreported.length) { addToast({ type: 'info', title: 'No unreported reversals for this filter' }); return }
    const period = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    markAsReported(unreported, period)
    addToast({ type: 'success', title: `${unreported.length} reversal(s) marked as reported` })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="ITC Reversal Register"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Reversal
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* Monthly aggregate — feeds into GSTR-3B Table 4(B) */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>GSTR-3B Table 4(B) — {MONTHS[selectedMonth - 1]} {selectedYear}</p>
            {unreportedCount > 0 && (
              <button onClick={handleMarkReported} className="flex items-center gap-1.5 text-xs text-brand-600 font-semibold hover:text-brand-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Reported ({unreportedCount})
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'CGST Reversed', value: monthAggregate.cgst },
              { label: 'SGST Reversed', value: monthAggregate.sgst },
              { label: 'IGST Reversed', value: monthAggregate.igst },
              { label: 'CESS Reversed', value: monthAggregate.cess },
              { label: 'Total Reversed', value: monthAggregate.total, bold: true },
            ].map(({ label, value, bold }) => (
              <div key={label} className="rounded-lg p-3 text-center bg-white" style={{ border: '1px solid var(--border)' }}>
                <p className={`text-sm font-bold tabular-nums ${bold ? 'text-err-600' : ''}`} style={bold ? {} : { color: 'var(--text)' }}>
                  ₹{value.toLocaleString('en-IN')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          <select value={filter.reason} onChange={(e) => setFilter({ reason: e.target.value as ITCReversalReason | 'all' })}
            className="h-9 rounded-lg border px-2 text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            <option value="all">All Reasons</option>
            {Object.entries(ITC_REVERSAL_REASON_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input value={filter.search} onChange={(e) => setFilter({ search: e.target.value })}
            placeholder="Search vendor, invoice..." className="h-9 flex-1 min-w-[200px] rounded-lg border px-3 text-sm outline-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 gap-3">
            <FileMinus className="w-10 h-10" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No ITC reversals recorded</p>
            <p className="text-xs text-center max-w-sm" style={{ color: 'var(--text-faint)' }}>Record reversals when ITC is reclaimed for personal use, exempt supplies, or non-payment after 180 days</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['Date', 'Vendor', 'Invoice#', 'Reason', 'CGST', 'SGST', 'IGST', 'Total', 'Reported'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(r.reversalDate)}</td>
                      <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--text)' }}>{r.vendorName}</td>
                      <td className="px-4 py-2.5 text-[13px] font-mono" style={{ color: 'var(--text-muted)' }}>{r.purchaseInvoiceNumber || '—'}</td>
                      <td className="px-4 py-2.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>{ITC_REVERSAL_REASON_LABELS[r.reason]}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums">₹{r.cgstReversed.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums">₹{r.sgstReversed.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums">₹{r.igstReversed.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-[13px] font-semibold tabular-nums text-err-600">₹{r.totalReversed.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={r.isReported ? 'success' : 'warning'}>{r.isReported ? 'Reported' : 'Pending'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add ITC Reversal" size="sm">
        <div className="p-5 flex flex-col gap-3">
          <div>
            <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Vendor Name *</label>
            <input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Purchase Invoice #</label>
              <input value={form.purchaseInvoiceNumber} onChange={(e) => setForm({ ...form, purchaseInvoiceNumber: e.target.value })}
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Original Invoice Date</label>
              <input type="date" value={form.originalInvoiceDate} onChange={(e) => setForm({ ...form, originalInvoiceDate: e.target.value })}
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
            </div>
          </div>
          <div>
            <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Reason for Reversal *</label>
            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as ITCReversalReason })}
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }}>
              {Object.entries(ITC_REVERSAL_REASON_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>CGST Reversed (₹)</label>
              <input type="number" min="0" value={form.cgstReversed} onChange={(e) => setForm({ ...form, cgstReversed: e.target.value })}
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} placeholder="0.00" />
            </div>
            <div>
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>SGST Reversed (₹)</label>
              <input type="number" min="0" value={form.sgstReversed} onChange={(e) => setForm({ ...form, sgstReversed: e.target.value })}
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} placeholder="0.00" />
            </div>
            <div>
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>IGST Reversed (₹)</label>
              <input type="number" min="0" value={form.igstReversed} onChange={(e) => setForm({ ...form, igstReversed: e.target.value })}
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} placeholder="0.00" />
            </div>
            <div>
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>CESS Reversed (₹)</label>
              <input type="number" min="0" value={form.cessReversed} onChange={(e) => setForm({ ...form, cessReversed: e.target.value })}
                className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full h-9 rounded-lg border px-3 text-sm outline-none" style={{ borderColor: 'var(--border)' }} placeholder="Additional details..." />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={() => setShowAddModal(false)} className="flex-1 h-9 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
          <button onClick={handleAdd} className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">Record Reversal</button>
        </div>
      </Modal>
    </div>
  )
}
