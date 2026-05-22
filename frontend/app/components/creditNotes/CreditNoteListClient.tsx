'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCreditNoteStore } from '@/lib/store/creditNoteStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { SearchBar } from '../ui/SearchBar'
import { Tabs } from '../ui/Tabs'
import { AmountDisplay } from '../ui/AmountDisplay'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatDate } from '@/lib/utils/formatters'
import { Plus, CheckCircle, Trash2, FileDown } from 'lucide-react'
import { CREDIT_NOTE_REASON_LABELS } from '@/types/creditNote'
import type { CreditNoteStatus } from '@/types/creditNote'
import { useBusinessStore } from '@/lib/store/businessStore'
import { downloadCreditNotePdf } from '@/lib/pdf/creditNotePdf'

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

export function CreditNoteListClient() {
  const { creditNotes, approveCreditNote, deleteCreditNote } = useCreditNoteStore()
  const { addToast } = useUIStore()
  const { profile } = useBusinessStore()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = useMemo(() =>
    creditNotes.filter((cn) => {
      if (activeTab !== 'all' && cn.status !== activeTab) return false
      if (search) {
        const q = search.toLowerCase()
        return cn.customerSnapshot.name.toLowerCase().includes(q) ||
          cn.creditNoteNumber.toLowerCase().includes(q) ||
          cn.linkedInvoiceNumber.toLowerCase().includes(q)
      }
      return true
    }),
    [creditNotes, search, activeTab]
  )

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Credit Notes"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <Link href="/credit-notes/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Credit Note
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        <div className="rounded-xl bg-white p-4 flex flex-wrap items-center gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by customer, CN#, invoice#..." className="flex-1 min-w-[200px]" />
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} records</span>
        </div>

        <Tabs tabs={STATUS_TABS} activeTab={activeTab} onChange={setActiveTab} />

        <div className="hidden lg:block rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Customer', 'CN #', 'Linked Invoice', 'Date', 'Reason', 'Amount', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No credit notes found</td></tr>
              ) : filtered.map((cn) => {
                const sc = STATUS_COLORS[cn.status]
                return (
                  <tr key={cn.id} onClick={() => {}} className="hover:bg-ink-50 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{cn.customerSnapshot.name}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>{cn.creditNoteNumber}</td>
                    <td className="px-4 py-3 text-xs">
                      <Link href={`/invoices/${cn.linkedInvoiceId}`} onClick={(e) => e.stopPropagation()}
                        className="text-brand-600 hover:underline">{cn.linkedInvoiceNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{formatDate(cn.createdAt.split('T')[0])}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{CREDIT_NOTE_REASON_LABELS[cn.reason]}</td>
                    <td className="px-4 py-3 font-semibold"><AmountDisplay amount={cn.grandTotal} /></td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{cn.status}</span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {cn.status === 'draft' && (
                          <button onClick={() => { approveCreditNote(cn.id); addToast({ type: 'success', title: 'Credit note approved' }) }}
                            className="p-1.5 rounded hover:bg-green-50 transition-colors" title="Approve">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          </button>
                        )}
                        {profile && (
                          <button onClick={() => void downloadCreditNotePdf(cn, profile)}
                            className="p-1.5 rounded hover:bg-brand-50 transition-colors" title="Download PDF">
                            <FileDown className="w-3.5 h-3.5 text-brand-600" />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(cn.id)} className="p-1.5 rounded hover:bg-err-50 transition-colors">
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
          {filtered.map((cn) => {
            const sc = STATUS_COLORS[cn.status]
            return (
              <div key={cn.id} className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{cn.customerSnapshot.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{cn.creditNoteNumber}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{cn.status}</span>
                    <AmountDisplay amount={cn.grandTotal} className="font-semibold text-sm" />
                  </div>
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{CREDIT_NOTE_REASON_LABELS[cn.reason]}</span>
                  <span>{formatDate(cn.createdAt.split('T')[0])}</span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No credit notes found</p>}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Credit Note"
        message="This credit note will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteTarget) { deleteCreditNote(deleteTarget); addToast({ type: 'success', title: 'Credit note deleted' }) } setDeleteTarget(null) }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
