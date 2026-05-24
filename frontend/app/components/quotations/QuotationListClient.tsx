'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuotationStore } from '@/lib/store/quotationStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { SearchBar } from '../ui/SearchBar'
import { Tabs } from '../ui/Tabs'
import { AmountDisplay } from '../ui/AmountDisplay'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatDate } from '@/lib/utils/formatters'
import { Plus, Eye, Trash2, FileCheck, Send, CheckCircle, XCircle } from 'lucide-react'
import type { QuotationStatus } from '@/types/quotation'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'expired', label: 'Expired' },
  { id: 'converted', label: 'Converted' },
]

const STATUS_COLORS: Record<QuotationStatus, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#6B7280' },
  sent: { bg: '#EEF2FF', text: '#4F46E5' },
  accepted: { bg: '#ECFDF5', text: '#059669' },
  rejected: { bg: '#FEF2F2', text: '#DC2626' },
  expired: { bg: '#FFF7ED', text: '#EA580C' },
  converted: { bg: '#F0FDF4', text: '#16A34A' },
}

export function QuotationListClient() {
  const { quotations, deleteQuotation, markSent, markAccepted, markRejected, convertToInvoice } = useQuotationStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = useMemo(() =>
    quotations.filter((q) => {
      if (activeTab !== 'all' && q.status !== activeTab) return false
      if (search) {
        const s = search.toLowerCase()
        return q.customerSnapshot.name.toLowerCase().includes(s) || q.quotationNumber.toLowerCase().includes(s)
      }
      return true
    }),
    [quotations, search, activeTab]
  )

  const handleConvert = async (id: string) => {
    const invoiceId = await convertToInvoice(id)
    if (invoiceId) { addToast({ type: 'success', title: 'Converted to invoice' }); router.push(`/invoices/${invoiceId}`) }
    else addToast({ type: 'error', title: 'Could not convert' })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Quotations"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <Link href="/quotations/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Quotation
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        <div className="rounded-xl bg-white p-4 flex flex-wrap items-center gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by customer, quote#..." className="flex-1 min-w-[200px]" />
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} quotations</span>
        </div>

        <Tabs tabs={STATUS_TABS} activeTab={activeTab} onChange={setActiveTab} />

        {/* Desktop table */}
        <div className="hidden lg:block rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Customer', 'Quote #', 'Date', 'Valid Until', 'Amount', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No quotations found</td></tr>
              ) : filtered.map((q) => {
                const sc = STATUS_COLORS[q.status]
                return (
                  <tr key={q.id} onClick={() => router.push(`/quotations/${q.id}`)}
                    className="cursor-pointer hover:bg-ink-50 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{q.customerSnapshot.name}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>{q.quotationNumber}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{formatDate(q.quotationDate)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{formatDate(q.validUntil)}</td>
                    <td className="px-4 py-3 font-semibold"><AmountDisplay amount={q.grandTotal} /></td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{q.status}</span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {q.status === 'draft' && (
                          <button onClick={() => { markSent(q.id); addToast({ type: 'success', title: 'Marked as sent' }) }} title="Mark Sent"
                            className="p-1.5 rounded hover:bg-brand-50 transition-colors">
                            <Send className="w-3.5 h-3.5 text-brand-600" />
                          </button>
                        )}
                        {(q.status === 'sent' || q.status === 'draft') && (
                          <>
                            <button onClick={() => { markAccepted(q.id); addToast({ type: 'success', title: 'Marked as accepted' }) }} title="Accept"
                              className="p-1.5 rounded hover:bg-green-50 transition-colors">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            </button>
                            <button onClick={() => { markRejected(q.id); addToast({ type: 'success', title: 'Marked as rejected' }) }} title="Reject"
                              className="p-1.5 rounded hover:bg-red-50 transition-colors">
                              <XCircle className="w-3.5 h-3.5 text-err-500" />
                            </button>
                          </>
                        )}
                        {(q.status === 'accepted' || q.status === 'sent') && (
                          <button onClick={() => handleConvert(q.id)} title="Convert to Invoice"
                            className="p-1.5 rounded hover:bg-brand-50 transition-colors">
                            <FileCheck className="w-3.5 h-3.5 text-brand-600" />
                          </button>
                        )}
                        {q.status === 'converted' && q.convertedToInvoiceId && (
                          <button onClick={() => router.push(`/invoices/${q.convertedToInvoiceId}`)}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-green-50 text-green-700 hover:bg-green-100">
                            View Invoice
                          </button>
                        )}
                        <button onClick={() => router.push(`/quotations/${q.id}`)}
                          className="p-1.5 rounded hover:bg-ink-100 transition-colors">
                          <Eye className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button onClick={() => setDeleteTarget(q.id)} className="p-1.5 rounded hover:bg-err-50 transition-colors">
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

        {/* Mobile cards */}
        <div className="lg:hidden flex flex-col gap-2">
          {filtered.map((q) => {
            const sc = STATUS_COLORS[q.status]
            return (
              <div key={q.id} onClick={() => router.push(`/quotations/${q.id}`)}
                className="rounded-xl bg-white p-4 cursor-pointer" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{q.customerSnapshot.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{q.quotationNumber}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{q.status}</span>
                    <AmountDisplay amount={q.grandTotal} className="font-semibold text-sm" />
                  </div>
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{formatDate(q.quotationDate)}</span>
                  <span>Valid till {formatDate(q.validUntil)}</span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No quotations found</p>}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Quotation"
        message="This quotation will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteTarget) { deleteQuotation(deleteTarget); addToast({ type: 'success', title: 'Quotation deleted' }) } setDeleteTarget(null) }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
