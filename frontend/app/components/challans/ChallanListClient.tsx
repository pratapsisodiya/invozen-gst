'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { useChallanStore } from '@/lib/store/challanStore'
import { TopBar } from '../app/TopBar'
import { Badge } from '../ui/Badge'
import { formatDate } from '@/lib/utils/formatters'
import { CHALLAN_TYPE_LABELS, CHALLAN_STATUS_LABELS } from '@/types/challan'
import { Plus, Truck, AlertTriangle } from 'lucide-react'

const STATUS_COLORS: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'error'> = {
  draft: 'neutral',
  issued: 'info',
  returned: 'success',
  converted: 'warning',
}

export function ChallanListClient() {
  const { getFilteredChallans, filter, setFilter, getOverdueReturns } = useChallanStore()
  const challans = getFilteredChallans()
  const overdueReturns = getOverdueReturns()

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Delivery Challans"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <Link href="/challans/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Challan
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        {overdueReturns.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl p-3 bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">{overdueReturns.length} challan{overdueReturns.length > 1 ? 's' : ''} pending return</p>
              <p className="text-xs text-amber-700">Goods sent on approval must be returned or converted to invoice within 6 months under GST.</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select value={filter.status} onChange={(e) => setFilter({ status: e.target.value as typeof filter.status })}
            className="h-9 rounded-lg border px-2 text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="returned">Returned</option>
            <option value="converted">Converted</option>
          </select>
          <select value={filter.challanType} onChange={(e) => setFilter({ challanType: e.target.value as typeof filter.challanType })}
            className="h-9 rounded-lg border px-2 text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            <option value="all">All Types</option>
            {Object.entries(CHALLAN_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input value={filter.search} onChange={(e) => setFilter({ search: e.target.value })}
            placeholder="Search challan#, party..." className="h-9 rounded-lg border px-3 text-sm outline-none flex-1 min-w-[200px]"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
        </div>

        {challans.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 gap-3">
            <Truck className="w-10 h-10" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No delivery challans found</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Create challans for job work, goods on approval, or branch transfers</p>
            <Link href="/challans/new" className="mt-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium">
              Create First Challan
            </Link>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['Challan #', 'Date', 'Type', 'To Party', 'Value', 'Transport', 'E-Way Bill', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {challans.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-ink-50/50 cursor-pointer" style={{ borderColor: 'var(--border-soft)' }}
                      onClick={() => window.location.href = `/challans/${c.id}`}>
                      <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--brand-600)' }}>{c.challanNumber}</td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(c.challanDate)}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>{CHALLAN_TYPE_LABELS[c.challanType]}</td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text)' }}>{c.toName}</td>
                      <td className="px-4 py-3 text-[13px] font-medium tabular-nums" style={{ color: 'var(--text)' }}>₹{c.totalValue.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>{c.vehicleNumber || '—'}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>{c.ewayBillNumber || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_COLORS[c.status]}>{CHALLAN_STATUS_LABELS[c.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {c.expectedReturnDate && c.status === 'issued' && c.expectedReturnDate < new Date().toISOString().split('T')[0] && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" aria-label="Return overdue" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
