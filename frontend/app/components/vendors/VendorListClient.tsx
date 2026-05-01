'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { SearchBar } from '../ui/SearchBar'
import { AmountDisplay } from '../ui/AmountDisplay'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Plus, Edit, Trash2 } from 'lucide-react'

export function VendorListClient() {
  const { vendors, deleteVendor, purchases } = usePurchaseStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return vendors
    const q = search.toLowerCase()
    return vendors.filter((v) =>
      v.name.toLowerCase().includes(q) ||
      v.businessName?.toLowerCase().includes(q) ||
      v.gstin?.toLowerCase().includes(q) ||
      v.phone?.includes(q)
    )
  }, [vendors, search])

  const getPurchaseCount = (vendorId: string) => purchases.filter((p) => p.vendorId === vendorId).length

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Vendors"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <Link href="/vendors/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Vendor
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        <div className="rounded-xl bg-white p-4 flex flex-wrap items-center gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, GSTIN, phone..." className="flex-1 min-w-[200px]" />
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} vendors</span>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Vendor', 'GSTIN', 'Phone', 'State', 'Total Purchases', 'ITC Claimed', 'Purchases', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No vendors found</td></tr>
              ) : filtered.map((v) => (
                <tr key={v.id} className="hover:bg-ink-50 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: 'var(--text)' }}>{v.businessName || v.name}</p>
                    {v.businessName && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.name}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>{v.gstin || '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-2)' }}>{v.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-2)' }}>{v.gstinState || '—'}</td>
                  <td className="px-4 py-3"><AmountDisplay amount={v.totalPurchases} className="text-sm" /></td>
                  <td className="px-4 py-3"><AmountDisplay amount={v.totalItcClaimed} className="text-sm" /></td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-2)' }}>{getPurchaseCount(v.id)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => router.push(`/vendors/${v.id}/edit`)}
                        className="p-1.5 rounded hover:bg-ink-100 transition-colors">
                        <Edit className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button onClick={() => setDeleteTarget(v.id)}
                        className="p-1.5 rounded hover:bg-err-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-err-500" />
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
          {filtered.map((v) => (
            <div key={v.id} className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{v.businessName || v.name}</p>
                  {v.gstin && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{v.gstin}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => router.push(`/vendors/${v.id}/edit`)} className="p-1.5 rounded hover:bg-ink-100">
                    <Edit className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button onClick={() => setDeleteTarget(v.id)} className="p-1.5 rounded hover:bg-err-50">
                    <Trash2 className="w-3.5 h-3.5 text-err-500" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{v.phone || v.email || '—'}</span>
                <AmountDisplay amount={v.totalPurchases} className="text-xs" />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No vendors found</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Vendor"
        message="This vendor will be permanently deleted. Associated purchases will remain."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteTarget) { deleteVendor(deleteTarget); addToast({ type: 'success', title: 'Vendor deleted' }) } setDeleteTarget(null) }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
