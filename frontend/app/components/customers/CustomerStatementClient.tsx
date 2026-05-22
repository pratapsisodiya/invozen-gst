'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useCreditNoteStore } from '@/lib/store/creditNoteStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { generateCustomerStatement } from '@/lib/gst/statementGenerator'
import { downloadCustomerStatementPdf } from '@/lib/pdf/customerStatement'
import { TopBar } from '../app/TopBar'
import { formatDate } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { FileText, ArrowLeft, Download, Printer, TrendingDown, TrendingUp } from 'lucide-react'

interface Props {
  customerId: string
}

export function CustomerStatementClient({ customerId }: Props) {
  const { invoices } = useInvoiceStore()
  const { payments } = usePaymentStore()
  const { getCustomerById } = useCustomerStore()
  const { creditNotes } = useCreditNoteStore()

  const customer = getCustomerById(customerId)
  const { profile } = useBusinessStore()
  const { addToast } = useUIStore()

  const today = new Date().toISOString().split('T')[0]
  const firstOfYear = `${new Date().getFullYear()}-01-01`

  const [fromDate, setFromDate] = useState(firstOfYear)
  const [toDate, setToDate] = useState(today)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const statement = useMemo(() => {
    if (!customer) return null
    return generateCustomerStatement(
      customerId,
      customer.name,
      invoices,
      payments,
      fromDate,
      toDate,
      creditNotes
    )
  }, [customer, customerId, invoices, payments, creditNotes, fromDate, toDate])

  const handlePrint = () => window.print()

  const handleDownloadPdf = async () => {
    if (!statement || !customer) return
    setDownloadingPdf(true)
    try {
      await downloadCustomerStatementPdf(statement, customer, profile.businessName)
      addToast({ type: 'success', title: 'Statement PDF downloaded' })
    } catch {
      addToast({ type: 'error', title: 'PDF generation failed' })
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (!customer) {
    return (
      <div className="flex flex-col flex-1">
        <TopBar title="Statement" />
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">Customer not found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 print:p-0">
      <TopBar
        title={`Statement — ${customer.name}`}
        breadcrumb={[
          { label: 'Customers', href: '/customers' },
          { label: customer.name, href: `/customers/${customerId}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || !statement}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> {downloadingPdf ? 'Generating…' : 'Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5 print:p-0">
        {/* Date Range Picker */}
        <div className="flex items-center gap-3 print:hidden">
          <label className="text-sm font-medium text-[var(--text-muted)]">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
          <label className="text-sm font-medium text-[var(--text-muted)]">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>

        {statement && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border bg-white">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Total Invoiced</p>
                <p className="font-bold text-xl tabular-nums">₹{statement.totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 rounded-xl border bg-white">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Total Paid</p>
                <p className="font-bold text-xl tabular-nums text-green-600">₹{statement.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className={cn('p-4 rounded-xl border', statement.closingBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200')}>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Closing Balance</p>
                <p className={cn('font-bold text-xl tabular-nums', statement.closingBalance > 0 ? 'text-amber-700' : 'text-green-700')}>
                  ₹{Math.abs(statement.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  {statement.closingBalance > 0 ? ' Dr' : statement.closingBalance < 0 ? ' Cr' : ''}
                </p>
              </div>
              <div className="p-4 rounded-xl border bg-white">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Transactions</p>
                <p className="font-bold text-xl tabular-nums">{statement.entries.length}</p>
              </div>
            </div>

            {/* Statement Table */}
            <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Account Statement</h3>
                  <p className="text-xs text-[var(--text-muted)]">{formatDate(fromDate)} — {formatDate(toDate)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[var(--text-primary)]">{customer.name}</p>
                  {customer.gstin && <p className="text-xs text-[var(--text-muted)]">GSTIN: {customer.gstin}</p>}
                </div>
              </div>

              {statement.entries.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-muted)] text-sm">
                  No transactions in selected period
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                        {['Date', 'Reference', 'Description', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)'].map((h) => (
                          <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${h.includes('₹') ? 'text-right' : 'text-left'}`}
                            style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {statement.entries.map((entry, i) => (
                        <tr key={i} className="border-t hover:bg-ink-50/50"
                          style={{ borderColor: 'var(--border-soft)' }}>
                          <td className="px-4 py-2.5 text-[13px] text-[var(--text-muted)] whitespace-nowrap">{formatDate(entry.date)}</td>
                          <td className="px-4 py-2.5">
                            {entry.type === 'invoice' ? (
                              <Link href={`/invoices?search=${entry.reference}`} className="font-mono text-[13px] text-brand-600 hover:underline">
                                {entry.reference}
                              </Link>
                            ) : (
                              <span className="font-mono text-[13px] text-[var(--text-muted)]">{entry.reference.slice(0, 8)}…</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[13px] text-[var(--text)]">{entry.description}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[13px] text-[var(--text)]">
                            {entry.debit > 0 ? entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[13px] text-green-600">
                            {entry.credit > 0 ? entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className={cn('px-4 py-2.5 text-right tabular-nums text-[13px] font-semibold', entry.balance > 0 ? 'text-amber-700' : 'text-green-700')}>
                            {entry.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            {entry.balance !== 0 ? (entry.balance > 0 ? ' Dr' : ' Cr') : ''}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--border)' }}>
                        <td colSpan={3} className="px-4 py-3 text-[13px] text-[var(--text)]">Closing Balance</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[13px]">
                          {statement.totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[13px] text-green-600">
                          {statement.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={cn('px-4 py-3 text-right tabular-nums text-[13px]', statement.closingBalance > 0 ? 'text-amber-700' : 'text-green-700')}>
                          {Math.abs(statement.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          {statement.closingBalance !== 0 ? (statement.closingBalance > 0 ? ' Dr' : ' Cr') : ''}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
