'use client'
import { useEffect, useState, startTransition, use } from 'react'
import { parsePortalToken } from '@/lib/portal/portalToken'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { formatDate } from '@/lib/utils/formatters'
import { StatusBadge } from '@/app/components/ui/Badge'

export default function CustomerPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [error, setError] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const { invoices } = useInvoiceStore()
  const { customers } = useCustomerStore()

  useEffect(() => {
    const payload = parsePortalToken(token)
    startTransition(() => {
      if (!payload) {
        setError('This link is invalid or has expired. Please contact the business for a new link.')
      } else {
        setCustomerId(payload.customerId)
      }
    })
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <p className="text-2xl mb-3">🔗</p>
          <h1 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>Link Expired</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!customerId) return null

  const customer = customers.find((c) => c.id === customerId)
  const customerInvoices = invoices.filter((inv) => inv.customerId === customerId && inv.status !== 'void')
  const outstanding = customerInvoices.filter((inv) => ['sent', 'overdue'].includes(inv.status)).reduce((s, i) => s + i.balanceDue, 0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="rounded-xl bg-white p-5 mb-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">G</div>
            <div>
              <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>Invoice Portal</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Powered by Invozen GST</p>
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Hi, {customer?.name || 'Valued Customer'} 👋</p>
            {outstanding > 0 && (
              <p className="text-xs mt-0.5 text-warn-700">You have ₹{outstanding.toLocaleString('en-IN')} outstanding balance</p>
            )}
          </div>
        </div>

        {/* Invoices */}
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Your Invoices</h2>
          </div>
          {customerInvoices.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No invoices found</div>
          ) : (
            <div className="flex flex-col">
              {customerInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  <div>
                    <p className="text-sm font-medium font-mono text-brand-600">{inv.invoiceNumber}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.invoiceDate)} · Due {formatDate(inv.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={inv.status} />
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>₹{inv.grandTotal.toLocaleString('en-IN')}</p>
                      {inv.balanceDue > 0 && inv.balanceDue < inv.grandTotal && (
                        <p className="text-xs text-warn-600">Due: ₹{inv.balanceDue.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          For queries, please contact the business directly.
        </p>
      </div>
    </div>
  )
}
