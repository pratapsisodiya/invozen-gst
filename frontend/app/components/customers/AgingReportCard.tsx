'use client'
import { useMemo, useState } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'

interface AgingBucket {
  label: string
  min: number
  max: number
  colorBar: string
  colorBadge: string
}

const BUCKETS: AgingBucket[] = [
  { label: 'Current',    min: -Infinity, max: 0,  colorBar: 'bg-ok-500',      colorBadge: 'bg-ok-100 text-ok-700' },
  { label: '1–30 days',  min: 1,         max: 30, colorBar: 'bg-warn-400',    colorBadge: 'bg-warn-100 text-warn-700' },
  { label: '31–60 days', min: 31,        max: 60, colorBar: 'bg-orange-400',  colorBadge: 'bg-orange-100 text-orange-700' },
  { label: '61–90 days', min: 61,        max: 90, colorBar: 'bg-err-400',     colorBadge: 'bg-err-100 text-err-700' },
  { label: '90+ days',   min: 91,        max: Infinity, colorBar: 'bg-err-600', colorBadge: 'bg-err-200 text-err-800' },
]

function getBucket(daysPastDue: number): number {
  return BUCKETS.findIndex((b) => daysPastDue >= b.min && daysPastDue <= b.max)
}

export function AgingReportCard() {
  const invoices = useInvoiceStore((state) => state.invoices)
  const customers = useCustomerStore((state) => state.customers)
  const [drillBucket, setDrillBucket] = useState<number | null>(null)
  const [filterName, setFilterName] = useState('')

  const todayMs = useMemo(() => new Date(new Date().toLocaleDateString('en-CA')).getTime(), [])

  const customerMap = useMemo(() => {
    const m: Record<string, string> = {}
    customers.forEach((c) => { m[c.id] = c.name })
    return m
  }, [customers])

  const outstanding = useMemo(() =>
    invoices.filter((inv) => (inv.status === 'sent' || inv.status === 'overdue') && inv.balanceDue > 0),
    [invoices]
  )

  const bucketData = useMemo(() => BUCKETS.map((b, bi) => {
    const items = outstanding.filter((inv) => {
      const days = Math.floor((todayMs - new Date(inv.dueDate).getTime()) / 86400000)
      return getBucket(days) === bi
    }).filter((inv) => {
      if (!filterName) return true
      const name = (customerMap[inv.customerId] || inv.customerSnapshot.name).toLowerCase()
      return name.includes(filterName.toLowerCase())
    })
    const total = items.reduce((s, i) => s + i.balanceDue, 0)
    return { ...b, items, total, count: items.length }
  }), [outstanding, todayMs, customerMap, filterName])

  const grandTotal = bucketData.reduce((s, b) => s + b.total, 0)

  const drillItems = drillBucket !== null ? bucketData[drillBucket].items : []

  return (
    <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Accounts Receivable Aging</h3>
        <input
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="Filter by customer…"
          className="text-xs px-2.5 py-1.5 rounded-lg outline-none"
          style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)', width: 160 }}
        />
      </div>

      {/* Stacked bar */}
      {grandTotal > 0 ? (
        <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
          {bucketData.map((b, i) => b.total > 0 && (
            <div
              key={i}
              className={`${b.colorBar} cursor-pointer transition-opacity hover:opacity-80 ${i === BUCKETS.length - 1 ? 'animate-pulse' : ''}`}
              style={{ width: `${(b.total / grandTotal) * 100}%` }}
              title={`${b.label}: ₹${b.total.toLocaleString('en-IN')}`}
              onClick={() => setDrillBucket(drillBucket === i ? null : i)}
            />
          ))}
        </div>
      ) : (
        <div className="h-3 rounded-full mb-4 bg-ink-100" />
      )}

      {/* Summary table */}
      <div className="flex flex-col gap-1 mb-2">
        {bucketData.map((b, i) => (
          <button
            key={i}
            onClick={() => setDrillBucket(drillBucket === i ? null : i)}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${drillBucket === i ? 'bg-ink-100' : 'hover:bg-ink-50'}`}
          >
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.colorBadge}`}>{b.label}</span>
              <span style={{ color: 'var(--text-muted)' }}>{b.count} invoice{b.count !== 1 ? 's' : ''}</span>
            </div>
            <span className="font-medium tabular-nums" style={{ color: 'var(--text)' }}>
              ₹{b.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </button>
        ))}
      </div>

      {/* Drill-down */}
      {drillBucket !== null && drillItems.length > 0 && (
        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Invoice</th>
                <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Customer</th>
                <th className="text-right px-3 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Due</th>
                <th className="text-right px-3 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {drillItems.map((inv, i) => {
                const days = Math.floor((todayMs - new Date(inv.dueDate).getTime()) / 86400000)
                return (
                  <tr key={inv.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text)' }}>{inv.invoiceNumber}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{customerMap[inv.customerId] || inv.customerSnapshot.name}</td>
                    <td className="px-3 py-2 text-right" style={{ color: 'var(--text-muted)' }}>{days > 0 ? `${days}d ago` : 'Today'}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                      ₹{inv.balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
