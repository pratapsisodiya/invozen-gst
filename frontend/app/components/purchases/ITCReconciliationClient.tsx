'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { reconcileITCByMonth } from '@/lib/gst/itcReconciliation'
import { TopBar } from '../app/TopBar'
import { cn } from '@/lib/utils/cn'
import { ShoppingCart, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react'

export function ITCReconciliationClient() {
  const { purchases, getItcSummary } = usePurchaseStore()
  const { invoices } = useInvoiceStore()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const summary = getItcSummary()
  const monthlyData = useMemo(() => reconcileITCByMonth(purchases, 6), [purchases])

  // Net GST payable: collected output tax minus ITC claimed
  const outputTax = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'paid' &&
      new Date(i.invoiceDate).getMonth() + 1 === currentMonth &&
      new Date(i.invoiceDate).getFullYear() === currentYear)
    return paid.reduce((s, i) => s + i.totalTax, 0)
  }, [invoices, currentMonth, currentYear])

  const currentMonthItc = useMemo(() => {
    return purchases
      .filter((p) => {
        const d = new Date(p.invoiceDate)
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear &&
          (p.itcStatus === 'eligible' || p.itcStatus === 'claimed')
      })
      .reduce((s, p) => s + p.itcAvailable, 0)
  }, [purchases, currentMonth, currentYear])

  const netPayable = Math.max(0, outputTax - currentMonthItc)

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="ITC Reconciliation"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <Link href="/purchases/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            Record Purchase
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* Overall Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border bg-white flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="text-xs uppercase tracking-wide font-medium">ITC Available</span>
            </div>
            <p className="font-bold text-xl tabular-nums">₹{summary.available.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-[var(--text-muted)]">Eligible + Claimed</p>
          </div>

          <div className="p-4 rounded-xl border bg-green-50 border-green-200 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-green-700">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-xs uppercase tracking-wide font-medium">ITC Claimed</span>
            </div>
            <p className="font-bold text-xl tabular-nums text-green-700">₹{summary.claimed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className={cn('p-4 rounded-xl border flex flex-col gap-1', summary.pending > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white')}>
            <div className={cn('flex items-center gap-1.5', summary.pending > 0 ? 'text-amber-700' : 'text-[var(--text-muted)]')}>
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs uppercase tracking-wide font-medium">Pending Claim</span>
            </div>
            <p className={cn('font-bold text-xl tabular-nums', summary.pending > 0 ? 'text-amber-700' : 'text-[var(--text)]')}>
              ₹{summary.pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            {summary.pending > 0 && <p className="text-xs text-amber-600">Eligible but not yet claimed</p>}
          </div>

          <div className="p-4 rounded-xl border bg-white flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <span className="text-xs uppercase tracking-wide font-medium">Net GST Payable (MTD)</span>
            </div>
            <p className="font-bold text-xl tabular-nums">₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-[var(--text-muted)]">Output ₹{outputTax.toFixed(0)} − ITC ₹{currentMonthItc.toFixed(0)}</p>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-semibold text-[var(--text-primary)]">Monthly ITC Breakdown</h3>
            <Link href="/purchases" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View purchases →</Link>
          </div>

          {monthlyData.every((m) => m.purchaseCount === 0) ? (
            <div className="text-center py-10">
              <p className="text-[var(--text-muted)] text-sm">No purchase records found</p>
              <Link href="/purchases/new" className="mt-2 inline-block text-sm text-brand-600 hover:underline font-medium">
                Record your first purchase →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['Period', 'Purchases', 'IGST', 'CGST', 'SGST', 'Total ITC', 'Status'].map((h) => (
                      <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${['IGST', 'CGST', 'SGST', 'Total ITC'].includes(h) ? 'text-right' : 'text-left'}`}
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((row) => (
                    <tr key={`${row.year}-${row.month}`} className="border-t hover:bg-ink-50/50"
                      style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-3 font-medium text-[13px] text-[var(--text)]">{row.label}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--text-muted)]">{row.purchaseCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[13px] text-[var(--text)]">
                        {row.igst > 0 ? `₹${row.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[13px] text-[var(--text)]">
                        {row.cgst > 0 ? `₹${row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[13px] text-[var(--text)]">
                        {row.sgst > 0 ? `₹${row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[13px] font-semibold text-[var(--text)]">
                        {row.total > 0 ? `₹${row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          {row.claimedCount > 0 && (
                            <span className="flex items-center gap-0.5 text-green-600 font-medium">
                              <CheckCircle className="w-3 h-3" /> {row.claimedCount} claimed
                            </span>
                          )}
                          {row.eligibleCount > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                              <Clock className="w-3 h-3" /> {row.eligibleCount} pending
                            </span>
                          )}
                          {row.ineligibleCount > 0 && (
                            <span className="flex items-center gap-0.5 text-red-500 font-medium">
                              <AlertTriangle className="w-3 h-3" /> {row.ineligibleCount} blocked
                            </span>
                          )}
                          {row.purchaseCount === 0 && (
                            <span className="text-[var(--text-muted)]">No purchases</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ITC Tips */}
        {summary.pending > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                ₹{summary.pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })} in ITC is eligible but not claimed
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Claim this ITC in GSTR-3B before the deadline to reduce your net tax liability.
              </p>
              <Link href="/purchases" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900">
                Review eligible purchases <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
