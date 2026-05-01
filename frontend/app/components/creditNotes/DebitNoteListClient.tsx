'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useCreditNoteStore } from '@/lib/store/creditNoteStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { SearchBar } from '../ui/SearchBar'
import { Tabs } from '../ui/Tabs'
import { AmountDisplay } from '../ui/AmountDisplay'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatDate } from '@/lib/utils/formatters'
import { Plus, CheckCircle, Trash2 } from 'lucide-react'
import { DEBIT_NOTE_REASON_LABELS } from '@/types/creditNote'
import type { CreditNoteStatus } from '@/types/creditNote'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'approved', label: 'Approved' },
  { id: 'adjusted', label: 'Adjusted' },
]

const STATUS_COLORS: Record<CreditNoteStatus, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#6B7280' },
  approved: { bg: '#ECFDF5', text: '#059669' },
  adjusted: { bg: '#EEF2FF', text: '#4F46E5' },
}

export function DebitNoteListClient() {
  const { debitNotes, approveDebitNote, deleteDebitNote } = useCreditNoteStore()
  const { addToast } = useUIStore()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = useMemo(() =>
    debitNotes.filter((dn) => {
      if (activeTab !== 'all' && dn.status !== activeTab) return false
      if (search) {
        const q = search.toLowerCase()
        return dn.vendorSnapshot.name.toLowerCase().includes(q) || dn.debitNoteNumber.toLowerCase().includes(q)
      }
      return true
    }),
    [debitNotes, search, activeTab]
  )

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Debit Notes"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <Link href="/debit-notes/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Debit Note
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        <div className="rounded-xl bg-white p-4 flex flex-wrap items-center gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by vendor, DN#..." className="flex-1 min-w-[200px]" />
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} records</span>
        </div>

        <Tabs tabs={STATUS_TABS} activeTab={activeTab} onChange={setActiveTab} />

        <div className="hidden lg:block rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Vendor', 'DN #', 'Linked Purchase', 'Date', 'Reason', 'Amount', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No debit notes found</td></tr>
              ) : filtered.map((dn) => {
                const sc = STATUS_COLORS[dn.status]
                return (
                  <tr key={dn.id} className="hover:bg-ink-50 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{dn.vendorSnapshot.name}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>{dn.debitNoteNumber}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{dn.linkedPurchaseNumber || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{formatDate(dn.createdAt.split('T')[0])}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{DEBIT_NOTE_REASON_LABELS[dn.reason]}</td>
                    <td className="px-4 py-3 font-semibold"><AmountDisplay amount={dn.grandTotal} /></td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{dn.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {dn.status === 'draft' && (
                          <button onClick={() => { approveDebitNote(dn.id); addToast({ type: 'success', title: 'Debit note approved' }) }}
                            className="p-1.5 rounded hover:bg-green-50 transition-colors" title="Approve">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(dn.id)} className="p-1.5 rounded hover:bg-err-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-err-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden flex flex-col gap-2">
          {filtered.map((dn) => {
            const sc = STATUS_COLORS[dn.status]
            return (
              <div key={dn.id} className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{dn.vendorSnapshot.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{dn.debitNoteNumber}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{dn.status}</span>
                    <AmountDisplay amount={dn.grandTotal} className="font-semibold text-sm" />
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{DEBIT_NOTE_REASON_LABELS[dn.reason]}</p>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No debit notes found</p>}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Debit Note"
        message="This debit note will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteTarget) { deleteDebitNote(deleteTarget); addToast({ type: 'success', title: 'Debit note deleted' }) } setDeleteTarget(null) }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
