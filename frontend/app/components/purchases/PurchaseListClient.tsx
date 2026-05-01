'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { SearchBar } from '../ui/SearchBar'
import { Tabs } from '../ui/Tabs'
import { AmountDisplay } from '../ui/AmountDisplay'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatDate } from '@/lib/utils/formatters'
import { Plus, ShoppingCart, TrendingUp, Clock, MoreVertical, Eye, Trash2, CheckCircle } from 'lucide-react'
import type { PurchaseStatus, ItcStatus } from '@/types/purchase'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'recorded', label: 'Recorded' },
  { id: 'claimed', label: 'Claimed' },
  { id: 'rejected', label: 'Rejected' },
]

const STATUS_COLORS: Record<PurchaseStatus, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#6B7280' },
  recorded: { bg: '#EEF2FF', text: '#4F46E5' },
  claimed: { bg: '#ECFDF5', text: '#059669' },
  rejected: { bg: '#FEF2F2', text: '#DC2626' },
}

const ITC_COLORS: Record<ItcStatus, { bg: string; text: string }> = {
  eligible: { bg: '#EEF2FF', text: '#4F46E5' },
  ineligible: { bg: '#F3F4F6', text: '#6B7280' },
  blocked: { bg: '#FEF2F2', text: '#DC2626' },
  claimed: { bg: '#ECFDF5', text: '#059669' },
  reversed: { bg: '#FFF7ED', text: '#EA580C' },
}

export function PurchaseListClient() {
  const { purchases, deletePurchase, claimItc, getItcSummary } = usePurchaseStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const itcSummary = getItcSummary()

  const filtered = useMemo(() =>
    purchases.filter((p) => {
      if (activeTab !== 'all' && p.status !== activeTab) return false
      if (search) {
        const q = search.toLowerCase()
        return p.vendorSnapshot.name.toLowerCase().includes(q) ||
          p.purchaseNumber.toLowerCase().includes(q) ||
          p.vendorInvoiceNumber.toLowerCase().includes(q)
      }
      return true
    }),
    [purchases, search, activeTab]
  )

  const handleDelete = () => {
    if (!deleteTarget) return
    deletePurchase(deleteTarget)
    addToast({ type: 'success', title: 'Purchase deleted' })
    setDeleteTarget(null)
  }

  const handleClaimItc = (id: string) => {
    claimItc(id)
    addToast({ type: 'success', title: 'ITC claimed successfully' })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Purchases"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <Link href="/purchases/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Purchase
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'ITC Available', value: itcSummary.available, icon: TrendingUp, color: '#4F46E5' },
            { label: 'ITC Claimed', value: itcSummary.claimed, icon: CheckCircle, color: '#059669' },
            { label: 'Pending ITC', value: itcSummary.pending, icon: Clock, color: '#F59E0B' },
            { label: 'ITC Reversed', value: itcSummary.reversed, icon: ShoppingCart, color: '#DC2626' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
              <span style={{ color: 'var(--text)' }}><AmountDisplay amount={value} className="text-lg font-bold" /></span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white p-4 flex flex-wrap items-center gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by vendor, purchase #..." className="flex-1 min-w-[200px]" />
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} records</span>
        </div>

        <Tabs tabs={STATUS_TABS} activeTab={activeTab} onChange={setActiveTab} />

        {/* Desktop table */}
        <div className="hidden lg:block rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Vendor', 'Purchase #', 'Vendor Invoice #', 'Date', 'Taxable', 'GST', 'Total', 'ITC', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No purchases found</td></tr>
              ) : filtered.map((p) => {
                const sc = STATUS_COLORS[p.status]
                const ic = ITC_COLORS[p.itcStatus]
                return (
                  <tr key={p.id} onClick={() => router.push(`/purchases/${p.id}`)}
                    className="cursor-pointer hover:bg-ink-50 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{p.vendorSnapshot.name}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>{p.purchaseNumber}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{p.vendorInvoiceNumber}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{formatDate(p.invoiceDate)}</td>
                    <td className="px-4 py-3"><AmountDisplay amount={p.taxableValue} className="text-sm" /></td>
                    <td className="px-4 py-3"><AmountDisplay amount={p.totalTax} className="text-sm" /></td>
                    <td className="px-4 py-3 font-semibold"><AmountDisplay amount={p.grandTotal} /></td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: ic.bg, color: ic.text }}>
                        {p.itcStatus === 'eligible' ? <span style={{ color: ic.text }}><AmountDisplay amount={p.itcAvailable} className="text-[11px]" /></span> : p.itcStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {p.itcStatus === 'eligible' && (
                          <button onClick={() => handleClaimItc(p.id)}
                            className="px-2 py-1 rounded text-[11px] font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors">
                            Claim ITC
                          </button>
                        )}
                        <button onClick={() => router.push(`/purchases/${p.id}`)}
                          className="p-1.5 rounded hover:bg-ink-100 transition-colors" aria-label="View">
                          <Eye className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button onClick={() => setDeleteTarget(p.id)}
                          className="p-1.5 rounded hover:bg-err-50 transition-colors" aria-label="Delete">
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
          {filtered.map((p) => {
            const sc = STATUS_COLORS[p.status]
            const ic = ITC_COLORS[p.itcStatus]
            return (
              <div key={p.id} onClick={() => router.push(`/purchases/${p.id}`)}
                className="rounded-xl bg-white p-4 cursor-pointer" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{p.vendorSnapshot.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.purchaseNumber}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{p.status}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: ic.bg, color: ic.text }}>{p.itcStatus}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(p.invoiceDate)}</span>
                  <AmountDisplay amount={p.grandTotal} className="font-semibold text-sm" />
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No purchases found</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Purchase"
        message="This purchase record will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
