'use client'
import { useState, useMemo, useEffect } from 'react'
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
import { formatDate } from '@/lib/utils/formatters'
import { Plus, MoreVertical, Eye, Edit, Download, Send, Trash2, Copy } from 'lucide-react'
import type { InvoiceStatus, Invoice } from '@/types/invoice'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
  { id: 'void', label: 'Void' },
]

function ActionMenu({ inv, onVoid, onDuplicate, onToast }: {
  inv: Invoice
  onVoid: (id: string) => void
  onDuplicate: (id: string) => void
  onToast: (msg: string) => void
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
              { icon: Send, label: 'Send', action: () => onToast('Send via WhatsApp or email from the invoice detail page') },
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
  const { invoices, updateInvoice, duplicateInvoice } = useInvoiceStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [voidTarget, setVoidTarget] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        router.push('/invoices/new')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])

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

  const handleVoid = (id: string) => {
    updateInvoice(id, { status: 'void' })
    setVoidTarget(null)
    addToast({ type: 'success', title: 'Invoice voided' })
  }

  const handleDuplicate = (id: string) => {
    const inv = invoices.find((i) => i.id === id)
    if (!inv) return
    duplicateInvoice(id)
    addToast({ type: 'success', title: 'Invoice duplicated', message: inv.invoiceNumber })
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
          <Link href="/invoices/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
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
                  {['Invoice No.', 'Customer', 'Date', 'Due Date', 'Amount', 'GST', 'Total', 'Status', ''].map((h) => (
                    <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${h === 'Amount' || h === 'GST' || h === 'Total' ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No invoices found</td></tr>
                ) : filtered.map((inv) => (
                  <tr key={inv.id} className="h-11 border-t hover:bg-ink-50/50 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-soft)' }}
                    onClick={() => router.push(`/invoices/${inv.id}`)}>
                    <td className="px-4 py-2">
                      <span className="font-mono text-[13px] text-brand-600">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{inv.customerSnapshot.name}</td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{inv.taxableValue.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[13px]" style={{ color: 'var(--text-muted)' }}>₹{inv.totalTax.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[13px] font-semibold" style={{ color: 'var(--text)' }}>₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        inv={inv}
                        onVoid={setVoidTarget}
                        onDuplicate={handleDuplicate}
                        onToast={(msg) => addToast({ type: 'info', title: 'Coming soon', message: msg })}
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
            <Link key={inv.id} href={`/invoices/${inv.id}`}
              className="rounded-xl bg-white p-4 flex flex-col gap-2"
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[13px] text-brand-600">{inv.invoiceNumber}</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{inv.customerSnapshot.name}</p>
                </div>
                <StatusBadge status={inv.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.invoiceDate)} · Due {formatDate(inv.dueDate)}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text)' }}>₹{inv.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </Link>
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
    </div>
  )
}
