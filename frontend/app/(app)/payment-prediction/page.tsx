'use client'
import { useState, useMemo } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { TopBar } from '@/app/components/app/TopBar'
import { PaymentPredictionCard } from '@/app/components/payments/PaymentPredictionCard'
import { buildCustomerPaymentProfiles } from '@/lib/reports/paymentPredictor'
import { formatCurrencyWithSymbol } from '@/lib/utils/formatters'
import { TrendingUp, Clock, AlertTriangle } from 'lucide-react'

export default function PaymentPredictionPage() {
  const { invoices } = useInvoiceStore()
  const { customers } = useCustomerStore()
  const { payments } = usePaymentStore()

  const profiles = useMemo(() => buildCustomerPaymentProfiles(invoices, payments), [invoices, payments])

  const outstandingCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const hasOutstanding = invoices.some(
          (inv) => inv.customerId === c.id && (inv.status === 'sent' || inv.status === 'overdue') && inv.balanceDue > 0
        )
        return hasOutstanding
      })
      .map((c) => {
        const profile = profiles.find((p) => p.customerId === c.id)
        const outstanding = invoices
          .filter((inv) => inv.customerId === c.id && (inv.status === 'sent' || inv.status === 'overdue'))
          .reduce((s, inv) => s + inv.balanceDue, 0)
        return { customer: c, profile, outstanding }
      })
      .sort((a, b) => b.outstanding - a.outstanding)
  }, [customers, invoices, profiles, payments])

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    outstandingCustomers[0]?.customer.id ?? null
  )

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Payment Prediction"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5 max-w-5xl mx-auto w-full">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Customers with Outstanding',
              value: outstandingCustomers.length,
              icon: Clock,
              color: 'text-brand-600',
            },
            {
              label: 'Total Outstanding',
              value: formatCurrencyWithSymbol(outstandingCustomers.reduce((s, r) => s + r.outstanding, 0)),
              icon: TrendingUp,
              color: 'text-brand-600',
            },
            {
              label: 'Overdue Customers',
              value: outstandingCustomers.filter(({ customer }) =>
                invoices.some((inv) => inv.customerId === customer.id && inv.status === 'overdue')
              ).length,
              icon: AlertTriangle,
              color: 'text-err-600',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
              <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Customer list */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Customers</p>
            </div>
            {outstandingCustomers.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No outstanding invoices</div>
            ) : (
              <div className="flex flex-col">
                {outstandingCustomers.map(({ customer, profile, outstanding }) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`flex items-start justify-between px-4 py-3 text-left border-t transition-colors hover:bg-ink-50 ${selectedCustomerId === customer.id ? 'bg-brand-50' : ''}`}
                    style={{ borderColor: 'var(--border-soft)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {customer.businessName || customer.name}
                      </p>
                      {profile && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Avg {profile.avgDaysToPay.toFixed(0)}d to pay
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
                        {formatCurrencyWithSymbol(outstanding)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Prediction card */}
          <div className="lg:col-span-2">
            {selectedCustomerId ? (
              <PaymentPredictionCard customerId={selectedCustomerId} />
            ) : (
              <div className="rounded-xl flex items-center justify-center py-20" style={{ border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a customer to see payment prediction</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
