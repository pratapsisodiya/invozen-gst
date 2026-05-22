'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { TopBar } from '../app/TopBar'
import { StatusBadge } from '../ui/Badge'
import { KpiCard } from '../ui/KpiCard'
import { AmountDisplay } from '../ui/AmountDisplay'
import { CustomerRiskCard } from '../ai/CustomerRiskCard'
import { PaymentPredictionCard } from '../payments/PaymentPredictionCard'
import { formatDate, getInitials, getDaysOverdue, getOverdueSeverity } from '@/lib/utils/formatters'
import { Phone, Mail, MapPin, FileText, Plus } from 'lucide-react'

export function CustomerDetailClient({ id }: { id: string }) {
  const { customers } = useCustomerStore()
  const { invoices } = useInvoiceStore()
  const { payments } = usePaymentStore()

  const customer = customers.find((c) => c.id === id)
  if (!customer) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Customer not found</div>

  const custInvoices = invoices.filter((i) => i.customerId === id).sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))
  const custPayments = payments.filter((p) => p.customerId === id).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))

  const totalInvoiced = custInvoices.filter((i) => i.status !== 'void').reduce((s, i) => s + i.grandTotal, 0)
  const totalPaid = custPayments.reduce((s, p) => s + p.amount, 0)
  const outstanding = custInvoices.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0)
  const overdueAmount = custInvoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.balanceDue, 0)
  const paidCount = custInvoices.filter((i) => i.status === 'paid').length
  const overdueCount = custInvoices.filter((i) => i.status === 'overdue').length
  const avgDaysToPay = useMemo(() => {
    const paidInvs = custInvoices.filter((i) => i.status === 'paid')
    if (paidInvs.length === 0) return 30
    const total = paidInvs.reduce((s, inv) => {
      const invDate = new Date(inv.invoiceDate).getTime()
      const pmt = custPayments.find((p) => p.invoiceId === inv.id)
      const pmtDate = pmt ? new Date(pmt.paymentDate).getTime() : new Date(inv.dueDate).getTime()
      return s + Math.max(0, Math.floor((pmtDate - invDate) / 86400000))
    }, 0)
    return Math.round(total / paidInvs.length)
  }, [custInvoices, custPayments])
  const lastInvoiceDate = custInvoices[0]?.invoiceDate ?? null

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={customer.name}
        breadcrumb={[{ label: 'Customers', href: '/customers' }]}
        actions={
          <Link href={`/invoices/new`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* Profile card */}
        <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-lg font-bold flex-shrink-0">
              {getInitials(customer.name)}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{customer.name}</h2>
              {customer.businessName && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{customer.businessName}</p>}
              {customer.gstin && <p className="text-sm font-mono text-brand-600 mt-1">{customer.gstin}</p>}
              <div className="flex flex-wrap gap-4 mt-3">
                {customer.phone && <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-2)' }}><Phone className="w-3.5 h-3.5" />{customer.phone}</span>}
                {customer.email && <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-2)' }}><Mail className="w-3.5 h-3.5" />{customer.email}</span>}
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-2)' }}><MapPin className="w-3.5 h-3.5" />{customer.billingAddress.city}, {customer.billingAddress.state}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/customers/${id}/statement`} className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                Statement
              </Link>
              <Link href={`/customers/${id}/edit`} className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                Edit
              </Link>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Total Invoiced" value={totalInvoiced} isAmount />
          <KpiCard title="Total Paid" value={totalPaid} isAmount />
          <KpiCard title="Outstanding" value={outstanding} isAmount subtextColor={outstanding > 0 ? 'warn' : 'default'} />
          <KpiCard title="Invoices" value={custInvoices.length} subtext={`${custInvoices.filter((i) => i.status === 'paid').length} paid`} />
        </div>

        {/* Credit utilization bar */}
        {customer.creditLimit != null && (
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)' }}>
            {(() => {
              const utilPct = customer.creditLimit > 0 ? (outstanding / customer.creditLimit) * 100 : 0
              return (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span style={{ color: 'var(--text)' }}>Outstanding: ₹{outstanding.toLocaleString('en-IN')}</span>
                    <span style={{ color: 'var(--text-muted)' }}>Limit: ₹{customer.creditLimit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${utilPct > 90 ? 'bg-err-500' : utilPct > 70 ? 'bg-warn-500' : 'bg-ok-500'}`}
                      style={{ width: `${Math.min(100, utilPct)}%` }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {utilPct.toFixed(0)}% utilised · ₹{(customer.creditLimit - outstanding).toLocaleString('en-IN')} available
                  </p>
                </>
              )
            })()}
          </div>
        )}

        {/* AI Risk Assessment */}
        <CustomerRiskCard
          customer={customer}
          totalInvoiced={totalInvoiced}
          totalPaid={totalPaid}
          overdueAmount={overdueAmount}
          invoiceCount={custInvoices.length}
          paidCount={paidCount}
          overdueCount={overdueCount}
          avgDaysToPay={avgDaysToPay}
          lastInvoiceDate={lastInvoiceDate}
        />

        {/* Payment Prediction */}
        <PaymentPredictionCard customerId={id} />

        {/* Invoice history */}
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Invoice History</h3>
          </div>
          {custInvoices.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No invoices yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Invoice No.', 'Date', 'Amount', 'Status', 'Aging'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {custInvoices.map((inv) => {
                  const days = getDaysOverdue(inv.dueDate)
                  const sev = getOverdueSeverity(days)
                  return (
                    <tr key={inv.id} className="h-11 border-t hover:bg-ink-50/50" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2"><Link href={`/invoices/${inv.id}`} className="font-mono text-[13px] text-brand-600 hover:text-brand-700">{inv.invoiceNumber}</Link></td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.invoiceDate)}</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-2">
                        {inv.status === 'overdue' && sev !== 'none' ? (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            sev === 'critical' ? 'bg-err-200 text-err-800 animate-pulse'
                            : sev === 'serious' ? 'bg-err-100 text-err-700'
                            : sev === 'moderate' ? 'bg-orange-100 text-orange-700'
                            : 'bg-warn-100 text-warn-700'
                          }`}>{days}d</span>
                        ) : inv.status === 'sent' && days > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-500">{days}d</span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
