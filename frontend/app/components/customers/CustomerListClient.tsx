'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { TopBar } from '../app/TopBar'
import { SearchBar } from '../ui/SearchBar'
import { Badge } from '../ui/Badge'
import { AmountDisplay } from '../ui/AmountDisplay'
import { Plus, CheckCircle, XCircle, MinusCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'
import { getInitials } from '@/lib/utils/formatters'

export function CustomerListClient() {
  const { customers } = useCustomerStore()
  const { invoices } = useInvoiceStore()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'b2b' | 'b2c' | 'export'>('all')

  const filtered = useMemo(() =>
    customers.filter((c) => {
      if (typeFilter !== 'all' && c.businessType !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.businessName?.toLowerCase().includes(q) ||
          c.phone?.includes(q) || c.gstin?.toLowerCase().includes(q)
      }
      return true
    }),
    [customers, search, typeFilter]
  )

  const getLastInvoiceDate = (custId: string) => {
    const invs = invoices.filter((i) => i.customerId === custId)
    if (!invs.length) return null
    return invs.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))[0].invoiceDate
  }

  const getOutstanding = (custId: string) =>
    invoices.filter((i) => i.customerId === custId && ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0)

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Customers"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <Link href="/customers/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Customer
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        <div className="rounded-xl bg-white p-4 flex flex-wrap items-center gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, GSTIN, phone..." className="flex-1 min-w-[200px]" />
          <div className="flex gap-1">
            {(['all', 'b2b', 'b2c', 'export'] as const).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === t ? 'bg-brand-600 text-white' : 'hover:bg-ink-50'}`}
                style={{ color: typeFilter === t ? undefined : 'var(--text-2)' }}>
                {t === 'all' ? 'All' : t === 'export' ? 'Export' : t.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} customers</span>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Customer', 'Phone', 'GSTIN', 'State', 'Outstanding', 'Last Invoice', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cust) => {
                const outstanding = getOutstanding(cust.id)
                const lastInv = getLastInvoiceDate(cust.id)
                return (
                  <tr key={cust.id} className="h-11 border-t hover:bg-ink-50/50 cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--border-soft)' }}
                    onClick={() => router.push(`/customers/${cust.id}`)}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-[11px] font-bold flex-shrink-0">
                          {getInitials(cust.name)}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{cust.name}</p>
                          {cust.businessName && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{cust.businessName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{cust.phone || '—'}</td>
                    <td className="px-4 py-2">
                      {cust.gstin ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-ok-600" />
                          <span className="font-mono text-[12px]" style={{ color: 'var(--text)' }}>{cust.gstin}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <MinusCircle className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
                          <span className="text-[12px]" style={{ color: 'var(--text-faint)' }}>Unregistered</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{cust.billingAddress.state}</td>
                    <td className="px-4 py-2">
                      {outstanding > 0
                        ? <AmountDisplay amount={outstanding} size="sm" color="warn" />
                        : <span className="text-[13px]" style={{ color: 'var(--text-faint)' }}>—</span>
                      }
                    </td>
                    <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{lastInv ? formatDate(lastInv) : '—'}</td>
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/invoices/new?customerId=${cust.id}`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">New Invoice</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden flex flex-col gap-2">
          {filtered.map((cust) => {
            const outstanding = getOutstanding(cust.id)
            return (
              <Link key={cust.id} href={`/customers/${cust.id}`}
                className="rounded-xl bg-white p-4 flex items-center gap-3"
                style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold flex-shrink-0">
                  {getInitials(cust.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{cust.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cust.gstin || 'B2C'} · {cust.billingAddress.state}</p>
                </div>
                {outstanding > 0 && <AmountDisplay amount={outstanding} size="sm" color="warn" />}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
