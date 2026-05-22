'use client'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { StatusBadge } from '../ui/Badge'
import { SearchBar } from '../ui/SearchBar'
import { Tabs } from '../ui/Tabs'
import { AmountDisplay } from '../ui/AmountDisplay'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { AIDraftInvoiceModal } from '../ai/AIDraftInvoiceModal'
import { formatDate, getDaysOverdue, getOverdueSeverity } from '@/lib/utils/formatters'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { Plus, MoreVertical, Eye, Edit, Download, Send, Trash2, Copy, CheckSquare, Square, X, Send as SendIcon, CheckCheck, Sparkles } from 'lucide-react'
import type { InvoiceStatus, Invoice } from '@/types/invoice'
import type { DraftedInvoice } from '@/app/api/ai/draft-invoice/route'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
  { id: 'void', label: 'Void' },
]

function ActionMenu({ inv, onVoid, onDuplicate }: {
  inv: Invoice
  onVoid: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="p-1.5 rounded-md hover:bg-ink-100 transition-colors" aria-label="Actions">
        <MoreVertical className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 rounded-xl py-1 min-w-[160px]"
            style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            {[
              { icon: Eye, label: 'View', action: () => router.push(`/invoices/${inv.id}`) },
              ...(inv.status === 'draft' ? [{ icon: Edit, label: 'Edit', action: () => router.push(`/invoices/${inv.id}/edit`) }] : []),
              { icon: Copy, label: 'Duplicate', action: () => onDuplicate(inv.id) },
              { icon: Download, label: 'Download PDF', action: () => window.print() },
              { icon: Send, label: 'Send', action: () => router.push(`/invoices/${inv.id}?action=send`) },
              { icon: Trash2, label: 'Void', action: () => onVoid(inv.id), danger: true },
            ].map(({ icon: Icon, label, action, danger }) => (
              <button key={label} onClick={(e) => { e.stopPropagation(); setOpen(false); action() }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-ink-50 ${danger ? 'text-err-600' : ''}`}
                style={!danger ? { color: 'var(--text)' } : {}}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function InvoiceListClient() {
  const { invoices, updateInvoice, duplicateInvoice, bulkUpdateStatus, bulkDelete } = useInvoiceStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [voidTarget, setVoidTarget] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<{ action: string; label: string } | null>(null)
  const [showAIDraft, setShowAIDraft] = useState(false)

  const handleAIDraftApply = (draft: DraftedInvoice) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ai-draft-invoice', JSON.stringify(draft))
    }
    router.push('/invoices/new?ai=1')
  }

  useKeyboardShortcut('n', () => router.push('/invoices/new'), { meta: true, preventDefault: true })
  useKeyboardShortcut('Escape', () => setSelectedIds(new Set()), { allowInInputs: false })

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (activeTab !== 'all' && inv.status !== activeTab) return false
      if (search) {
        const q = search.toLowerCase()
        return inv.invoiceNumber.toLowerCase().includes(q) || inv.customerSnapshot.name.toLowerCase().includes(q)
      }
      return true
    })
  }, [invoices, activeTab, search])

  const totals = useMemo(() => ({
    total: filtered.reduce((s, i) => s + i.grandTotal, 0),
    outstanding: filtered.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0),
  }), [filtered])

  const allSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id))
  const someSelected = selectedIds.size > 0

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)))
    }
  }, [allSelected, filtered])

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleVoid = (id: string) => {
    void updateInvoice(id, { status: 'void' })
    setVoidTarget(null)
    addToast({ type: 'success', title: 'Invoice voided' })
  }

  const handleDuplicate = (id: string) => {
    const inv = invoices.find((i) => i.id === id)
    if (!inv) return
    duplicateInvoice(id)
    addToast({ type: 'success', title: 'Invoice duplicated', message: inv.invoiceNumber })
  }

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds)
    if (action === 'sent') {
      await bulkUpdateStatus(ids, 'sent')
      addToast({ type: 'success', title: `${ids.length} invoice${ids.length > 1 ? 's' : ''} marked as Sent` })
    } else if (action === 'paid') {
      await bulkUpdateStatus(ids, 'paid')
      addToast({ type: 'success', title: `${ids.length} invoice${ids.length > 1 ? 's' : ''} marked as Paid` })
    } else if (action === 'delete') {
      await bulkDelete(ids)
      addToast({ type: 'success', title: `${ids.length} invoice${ids.length > 1 ? 's' : ''} deleted` })
    }
    setSelectedIds(new Set())
    setBulkConfirm(null)
  }

  const tabsWithCount = STATUS_TABS.map((t) => ({
    ...t,
    count: t.id === 'all' ? invoices.length : invoices.filter((i) => i.status === t.id).length,
  }))

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Invoices"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAIDraft(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Sparkles className="w-4 h-4 text-brand-600" /> AI Draft
            </button>
            <Link href="/invoices/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> New Invoice
            </Link>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        {/* Bulk action toolbar */}
        {someSelected && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-200">
            <span className="text-sm font-semibold text-brand-700">{selectedIds.size} selected</span>
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => setBulkConfirm({ action: 'sent', label: 'Mark as Sent' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-brand-200 text-brand-700 hover:bg-brand-100 transition-colors"
              >
                <SendIcon className="w-3.5 h-3.5" /> Mark Sent
              </button>
              <button
                onClick={() => setBulkConfirm({ action: 'paid', label: 'Mark as Paid' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-brand-200 text-brand-700 hover:bg-brand-100 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark Paid
              </button>
              <button
                onClick={() => setBulkConfirm({ action: 'delete', label: 'Delete' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 rounded-lg hover:bg-brand-100 text-brand-600 transition-colors"
                aria-label="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 pt-3">
            <Tabs tabs={tabsWithCount} activeTab={activeTab} onChange={setActiveTab} />
          </div>
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search by invoice # or customer..." className="flex-1 max-w-md" />
            <div className="text-[13px] ml-auto" style={{ color: 'var(--text-muted)' }}>
              <span className="tabular-nums">{filtered.length}</span> invoices
              {' · '}Total: <span className="tabular-nums font-medium" style={{ color: 'var(--text)' }}>₹{totals.total.toLocaleString('en-IN')}</span>
              {totals.outstanding > 0 && (
                <span> · Outstanding: <span className="tabular-nums text-warn-600 font-medium">₹{totals.outstanding.toLocaleString('en-IN')}</span></span>
              )}
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <th className="px-4 py-2.5 w-8">
                    <button onClick={toggleAll} aria-label="Select all">
                      {allSelected
                        ? <CheckSquare className="w-4 h-4 text-brand-600" />
                        : <Square className="w-4 h-4 text-[var(--text-muted)]" />}
                    </button>
                  </th>
                  {['Invoice No.', 'Customer', 'Date', 'Due Date', 'Amount', 'GST', 'Total', 'Status', ''].map((h) => (
                    <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${h === 'Amount' || h === 'GST' || h === 'Total' ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No invoices found</td></tr>
                ) : filtered.map((inv) => (
                  <tr key={inv.id}
                    className={`h-11 border-t hover:bg-ink-50/50 transition-colors cursor-pointer ${selectedIds.has(inv.id) ? 'bg-brand-50/60' : ''}`}
                    style={{ borderColor: 'var(--border-soft)' }}
                    onClick={() => router.push(`/invoices/${inv.id}`)}>
                    <td className="px-4 py-2" onClick={(e) => { e.stopPropagation(); toggleOne(inv.id) }}>
                      {selectedIds.has(inv.id)
                        ? <CheckSquare className="w-4 h-4 text-brand-600" />
                        : <Square className="w-4 h-4 text-[var(--text-muted)]" />}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-[13px] text-brand-600">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{inv.customerSnapshot.name}</td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{inv.taxableValue.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[13px]" style={{ color: 'var(--text-muted)' }}>₹{inv.totalTax.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[13px] font-semibold" style={{ color: 'var(--text)' }}>₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={inv.status} />
                        {inv.status === 'overdue' && (() => {
                          const days = getDaysOverdue(inv.dueDate)
                          const sev = getOverdueSeverity(days)
                          const cls = sev === 'critical' ? 'bg-err-200 text-err-800 animate-pulse'
                            : sev === 'serious' ? 'bg-err-100 text-err-700'
                            : sev === 'moderate' ? 'bg-orange-100 text-orange-700'
                            : 'bg-warn-100 text-warn-700'
                          return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cls}`}>{days}d</span>
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        inv={inv}
                        onVoid={setVoidTarget}
                        onDuplicate={handleDuplicate}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden flex flex-col gap-2">
          {filtered.map((inv) => (
            <div key={inv.id}
              className={`rounded-xl bg-white p-4 flex flex-col gap-2 ${selectedIds.has(inv.id) ? 'ring-2 ring-brand-400' : ''}`}
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleOne(inv.id)} aria-label="Select">
                    {selectedIds.has(inv.id)
                      ? <CheckSquare className="w-4 h-4 text-brand-600" />
                      : <Square className="w-4 h-4 text-[var(--text-muted)]" />}
                  </button>
                  <div>
                    <p className="font-mono text-[13px] text-brand-600">{inv.invoiceNumber}</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{inv.customerSnapshot.name}</p>
                  </div>
                </div>
                <StatusBadge status={inv.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.invoiceDate)} · Due {formatDate(inv.dueDate)}</span>
                <Link href={`/invoices/${inv.id}`} className="text-sm font-semibold tabular-nums hover:text-brand-600" style={{ color: 'var(--text)' }}>
                  ₹{inv.grandTotal.toLocaleString('en-IN')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        onConfirm={() => voidTarget && handleVoid(voidTarget)}
        title="Void Invoice"
        message="Are you sure you want to void this invoice? This action cannot be undone."
        confirmLabel="Void Invoice"
        variant="danger"
      />

      <ConfirmDialog
        open={!!bulkConfirm}
        onClose={() => setBulkConfirm(null)}
        onConfirm={() => bulkConfirm && void handleBulkAction(bulkConfirm.action)}
        title={`Bulk: ${bulkConfirm?.label ?? ''}`}
        message={`Apply "${bulkConfirm?.label}" to ${selectedIds.size} selected invoice${selectedIds.size > 1 ? 's' : ''}?`}
        confirmLabel={bulkConfirm?.label ?? 'Confirm'}
        variant={bulkConfirm?.action === 'delete' ? 'danger' : 'default'}
      />

      <AIDraftInvoiceModal
        open={showAIDraft}
        onClose={() => setShowAIDraft(false)}
        onApply={handleAIDraftApply}
      />
    </div>
  )
}
