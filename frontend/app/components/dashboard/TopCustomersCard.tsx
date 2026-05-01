import type { Customer } from '@/types/customer'
import type { Invoice } from '@/types/invoice'
import Link from 'next/link'
import { getInitials } from '@/lib/utils/formatters'

interface TopCustomersCardProps {
  customers: Customer[]
  invoices: Invoice[]
}

export function TopCustomersCard({ customers, invoices }: TopCustomersCardProps) {
  const topCustomers = customers
    .map((c) => ({
      ...c,
      revenue: invoices.filter((i) => i.customerId === c.id && i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const maxRevenue = topCustomers[0]?.revenue || 1

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Top Customers</h3>
        <Link href="/customers" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all →</Link>
      </div>
      <div className="flex flex-col">
        {topCustomers.map((cust) => (
          <Link key={cust.id} href={`/customers/${cust.id}`} className="flex items-center gap-3 px-4 py-3 border-t hover:bg-ink-50/50 transition-colors" style={{ borderColor: 'var(--border-soft)' }}>
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
              {getInitials(cust.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>{cust.name}</p>
              <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${(cust.revenue / maxRevenue) * 100}%` }} />
              </div>
            </div>
            <span className="text-[13px] tabular-nums font-medium" style={{ color: 'var(--text)' }}>
              ₹{(cust.revenue / 1000).toFixed(1)}K
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
