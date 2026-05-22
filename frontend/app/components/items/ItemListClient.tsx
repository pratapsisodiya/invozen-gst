'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useItemStore } from '@/lib/store/itemStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { SearchBar } from '../ui/SearchBar'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { BulkImportModal } from '../import/BulkImportModal'
import { Plus, Package, Briefcase, Pencil, Trash2, Upload } from 'lucide-react'
import type { ItemType } from '@/types/item'

const GST_FILTERS = ['all', '0', '5', '12', '18', '28'] as const

export function ItemListClient() {
  const { items, deleteItem } = useItemStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ItemType>('all')
  const [gstFilter, setGstFilter] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const filtered = useMemo(() =>
    items.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (gstFilter !== 'all' && String(item.defaultGstRate) !== gstFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return item.name.toLowerCase().includes(q) ||
          item.hsnCode?.includes(q) ||
          item.sacCode?.includes(q) ||
          item.description?.toLowerCase().includes(q)
      }
      return true
    }),
    [items, search, typeFilter, gstFilter]
  )

  const handleDelete = () => {
    if (!deleteId) return
    deleteItem(deleteId)
    setDeleteId(null)
    addToast({ type: 'success', title: 'Item deleted' })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Items"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </button>
            <Link href="/items/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Item
            </Link>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        {/* Filters */}
        <div className="rounded-xl bg-white p-4 flex flex-wrap items-center gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, HSN, SAC..." className="flex-1 min-w-[200px]" />
          <div className="flex gap-1">
            {(['all', 'product', 'service'] as const).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === t ? 'bg-brand-600 text-white' : 'hover:bg-ink-50'}`}
                style={{ color: typeFilter === t ? undefined : 'var(--text-2)' }}>
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {GST_FILTERS.map((r) => (
              <button key={r} onClick={() => setGstFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${gstFilter === r ? 'bg-brand-600 text-white' : 'hover:bg-ink-50'}`}
                style={{ color: gstFilter === r ? undefined : 'var(--text-2)' }}>
                {r === 'all' ? 'All GST' : `${r}%`}
              </button>
            ))}
          </div>
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} items</span>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Type', 'HSN / SAC', 'Unit', 'Default Rate', 'GST Rate', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No items found</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id} className="h-11 border-t hover:bg-ink-50/50 cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--border-soft)' }}
                  onClick={() => router.push(`/items/${item.id}/edit`)}>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: item.type === 'product' ? 'var(--brand-50, #f0fdfa)' : 'var(--surface)' }}>
                        {item.type === 'product'
                          ? <Package className="w-3.5 h-3.5 text-brand-600" />
                          : <Briefcase className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{item.name}</p>
                        {item.description && <p className="text-[11px] truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>{item.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${item.type === 'product' ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-600'}`}>
                      {item.type === 'product' ? 'Product' : 'Service'}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {item.hsnCode || item.sacCode || '—'}
                  </td>
                  <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{item.unit}</td>
                  <td className="px-4 py-2 tabular-nums text-[13px] text-right" style={{ color: 'var(--text)' }}>₹{item.defaultRate.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-ok-50 text-ok-600">
                      {item.defaultGstRate}%
                    </span>
                  </td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Link href={`/items/${item.id}/edit`} className="p-1.5 rounded hover:bg-ink-100 transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded hover:bg-err-50 transition-colors text-err-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden flex flex-col gap-2">
          {filtered.map((item) => (
            <Link key={item.id} href={`/items/${item.id}/edit`}
              className="rounded-xl bg-white p-4 flex items-center gap-3"
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: item.type === 'product' ? 'var(--brand-50, #f0fdfa)' : 'var(--surface)' }}>
                {item.type === 'product'
                  ? <Package className="w-5 h-5 text-brand-600" />
                  : <Briefcase className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {item.hsnCode || item.sacCode || 'No code'} · {item.unit} · GST {item.defaultGstRate}%
                </p>
              </div>
              <p className="tabular-nums text-sm font-semibold" style={{ color: 'var(--text)' }}>₹{item.defaultRate.toLocaleString('en-IN')}</p>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No items found</div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? This cannot be undone."
        variant="danger"
        confirmLabel="Delete"
      />
      <BulkImportModal open={showImport} onClose={() => setShowImport(false)} />
    </div>
  )
}
