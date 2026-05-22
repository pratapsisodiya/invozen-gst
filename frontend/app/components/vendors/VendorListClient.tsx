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
import { Modal } from '../ui/Modal'
import { Plus, Edit, Trash2, Sparkles, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, AlertTriangle } from 'lucide-react'
import { VendorReliabilityCard } from './VendorReliabilityCard'
import type { Vendor } from '@/types/purchase'

interface VendorRisk {
  riskScore: 'low' | 'medium' | 'high'
  flags: string[]
  itcRiskAmount: number
  recommendations: string[]
}

export function VendorListClient() {
  const { vendors, deleteVendor, purchases } = usePurchaseStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [riskResults, setRiskResults] = useState<Map<string, VendorRisk>>(new Map())
  const [riskLoading, setRiskLoading] = useState<Set<string>>(new Set())
  const [riskModal, setRiskModal] = useState<{ vendor: Vendor; risk: VendorRisk } | null>(null)

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

  const handleRiskCheck = async (vendor: Vendor) => {
    if (riskLoading.has(vendor.id)) return
    setRiskLoading((prev) => new Set(prev).add(vendor.id))
    try {
      const vendorPurchases = purchases.filter((p) => p.vendorId === vendor.id)
      const res = await fetch('/api/ai/vendor-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor, purchases: vendorPurchases }),
      })
      if (!res.ok) throw new Error('Risk check failed')
      const data = await res.json() as VendorRisk
      setRiskResults((prev) => new Map(prev).set(vendor.id, data))
      setRiskModal({ vendor, risk: data })
    } catch {
      addToast({ type: 'error', title: 'Could not assess vendor risk' })
    } finally {
      setRiskLoading((prev) => { const s = new Set(prev); s.delete(vendor.id); return s })
    }
  }

  const RiskBadge = ({ vendorId, vendor }: { vendorId: string; vendor: Vendor }) => {
    const risk = riskResults.get(vendorId)
    const loading = riskLoading.has(vendorId)
    if (loading) return <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
    if (risk) {
      const colors = { low: 'bg-ok-50 text-ok-700', medium: 'bg-warn-50 text-warn-700', high: 'bg-err-50 text-err-700' }
      const icons = { low: <ShieldCheck className="w-3 h-3" />, medium: <ShieldQuestion className="w-3 h-3" />, high: <ShieldAlert className="w-3 h-3" /> }
      return (
        <button
          onClick={() => setRiskModal({ vendor, risk })}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${colors[risk.riskScore]}`}
        >
          {icons[risk.riskScore]} {risk.riskScore}
        </button>
      )
    }
    return (
      <button
        onClick={() => void handleRiskCheck(vendor)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border hover:bg-ink-50 transition-colors"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        <Sparkles className="w-3 h-3 text-brand-600" /> AI Risk
      </button>
    )
  }

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
        <VendorReliabilityCard vendors={vendors} />

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
                    <div className="flex items-center gap-1.5">
                      <RiskBadge vendorId={v.id} vendor={v} />
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
              <div className="flex justify-between items-center text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{v.phone || v.email || '—'}</span>
                <div className="flex items-center gap-2">
                  <AmountDisplay amount={v.totalPurchases} className="text-xs" />
                  <RiskBadge vendorId={v.id} vendor={v} />
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No vendors found</p>
          )}
        </div>
      </div>

      {/* Vendor Risk Modal */}
      {riskModal && (
        <Modal open={!!riskModal} onClose={() => setRiskModal(null)} title="Vendor Risk Assessment" size="sm">
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{riskModal.vendor.businessName || riskModal.vendor.name}</p>
                {riskModal.vendor.gstin && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{riskModal.vendor.gstin}</p>}
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                riskModal.risk.riskScore === 'low' ? 'bg-ok-50 text-ok-700'
                : riskModal.risk.riskScore === 'medium' ? 'bg-warn-50 text-warn-700'
                : 'bg-err-50 text-err-700'
              }`}>
                {riskModal.risk.riskScore === 'low' ? <ShieldCheck className="w-4 h-4" />
                  : riskModal.risk.riskScore === 'medium' ? <ShieldQuestion className="w-4 h-4" />
                  : <ShieldAlert className="w-4 h-4" />}
                {riskModal.risk.riskScore.charAt(0).toUpperCase() + riskModal.risk.riskScore.slice(1)} Risk
              </div>
            </div>

            {riskModal.risk.itcRiskAmount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warn-50 text-warn-700 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                ITC at risk of reversal: ₹{riskModal.risk.itcRiskAmount.toLocaleString('en-IN')}
              </div>
            )}

            {riskModal.risk.flags.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Risk Flags</p>
                {riskModal.risk.flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-warn-500 flex-shrink-0 mt-1.5" />
                    {flag}
                  </div>
                ))}
              </div>
            )}

            {riskModal.risk.recommendations.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Recommendations</p>
                {riskModal.risk.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-600 flex-shrink-0 mt-1.5" />
                    {rec}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-5 pb-5">
            <button onClick={() => setRiskModal(null)}
              className="w-full h-10 rounded-lg border text-sm font-medium hover:bg-ink-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Close
            </button>
          </div>
        </Modal>
      )}

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
