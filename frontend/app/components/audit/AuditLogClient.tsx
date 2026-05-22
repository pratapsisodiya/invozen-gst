'use client'
import { useState, useMemo } from 'react'
import { useAuditStore } from '@/lib/store/auditStore'
import { TopBar } from '../app/TopBar'
import { SearchBar } from '../ui/SearchBar'
import type { AuditEntity, AuditAction } from '@/types/audit'
import { formatDate } from '@/lib/utils/formatters'
import { FileText, Users, ShoppingCart, CreditCard, Package, Trash2, Edit, Plus, RotateCcw } from 'lucide-react'

const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'bg-ok-50 text-ok-700',
  update: 'bg-blue-50 text-blue-700',
  delete: 'bg-err-50 text-err-600',
  status_change: 'bg-warn-50 text-warn-700',
  payment: 'bg-brand-50 text-brand-700',
  export: 'bg-gray-100 text-gray-600',
}

const ENTITY_ICONS: Record<AuditEntity, React.ElementType> = {
  invoice: FileText,
  customer: Users,
  purchase: ShoppingCart,
  payment: CreditCard,
  item: Package,
  vendor: ShoppingCart,
  credit_note: FileText,
  debit_note: FileText,
  quotation: FileText,
  expense: CreditCard,
}

export function AuditLogClient() {
  const { entries, clear } = useAuditStore()
  const [search, setSearch] = useState('')
  const [filterEntity, setFilterEntity] = useState<AuditEntity | 'all'>('all')

  const filtered = useMemo(() => entries.filter((e) => {
    if (filterEntity !== 'all' && e.entity !== filterEntity) return false
    if (search) {
      const q = search.toLowerCase()
      return e.entityLabel.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.userName.toLowerCase().includes(q)
    }
    return true
  }), [entries, search, filterEntity])

  const ENTITY_OPTIONS: Array<{ value: AuditEntity | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'customer', label: 'Customers' },
    { value: 'purchase', label: 'Purchases' },
    { value: 'payment', label: 'Payments' },
    { value: 'expense', label: 'Expenses' },
  ]

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Audit Log"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <button onClick={() => { if (confirm('Clear all audit log entries?')) clear() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium text-err-600 hover:bg-err-50 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <Trash2 className="w-3.5 h-3.5" /> Clear Log
          </button>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Search activity..." className="flex-1 max-w-md" />
          <div className="flex gap-1.5 flex-wrap">
            {ENTITY_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setFilterEntity(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterEntity === opt.value ? 'bg-brand-600 text-white' : 'border hover:bg-ink-50'}`}
                style={filterEntity !== opt.value ? { borderColor: 'var(--border)', color: 'var(--text-2)' } : {}}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {entries.length === 0 ? 'No activity recorded yet. Actions on invoices, customers, and purchases will appear here.' : 'No entries match your filter.'}
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map((entry) => {
                const Icon = ENTITY_ICONS[entry.entity] || FileText
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'var(--surface)' }}>
                      <Icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{entry.description}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${ACTION_COLORS[entry.action]}`}>
                          {entry.action.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {entry.entityLabel} · {entry.userName} · {new Date(entry.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {entries.length} entries · Last 500 actions stored
        </p>
      </div>
    </div>
  )
}
