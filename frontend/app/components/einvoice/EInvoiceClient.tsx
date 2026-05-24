'use client'
import { useState, useMemo, useCallback, useRef } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { StatusBadge } from '../ui/Badge'
import { formatDate } from '@/lib/utils/formatters'
import { FileText, CheckCircle2, XCircle, Info } from 'lucide-react'
import { useBusinessStore } from '@/lib/store/businessStore'

type IRNStatus = 'pending' | 'generating' | 'generated' | 'cancelled'

interface IRNRecord {
  invoiceId: string
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  amount: number
  irn: string | null
  status: IRNStatus
  generatedAt: string | null
}

// Deterministic IRN: same invoice always yields same 64-char hex (NIC IRP format simulation)
function generateDeterministicIRN(invoiceNumber: string, invoiceDate: string, gstin: string): string {
  const seed = `${gstin}_${invoiceDate.substring(0, 4)}_INV_${invoiceNumber}`
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  const chars = '0123456789abcdef'
  let irn = ''
  let state = h
  for (let i = 0; i < 64; i++) {
    irn += chars[(state + seed.charCodeAt(i % seed.length)) & 15]
    state = ((state << 5) ^ (state >> 2) ^ seed.charCodeAt(i % seed.length)) >>> 0
  }
  return irn
}

export function EInvoiceClient() {
  const { invoices } = useInvoiceStore()
  const { addToast } = useUIStore()
  const { profile } = useBusinessStore()

  const [irnRecords, setIrnRecords] = useState<Map<string, IRNRecord>>(new Map())

  const eligibleInvoices = useMemo(() =>
    invoices.filter((i) => ['sent', 'paid', 'overdue'].includes(i.status))
      .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate)),
    [invoices]
  )

  const getRecord = (invoiceId: string): IRNRecord | undefined => irnRecords.get(invoiceId)

  const handleGenerate = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId)
    if (!inv) return

    // Use the business GSTIN from the invoice snapshot or a fallback
    const gstin = profile.gstin || 'UNREGISTERED'
    const irn = generateDeterministicIRN(inv.invoiceNumber, inv.invoiceDate, gstin)
    const now = new Date().toISOString()

    setIrnRecords((prev) => {
      const next = new Map(prev)
      next.set(invoiceId, {
        invoiceId,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        customerName: inv.customerSnapshot.name,
        amount: inv.grandTotal,
        irn,
        status: 'generated',
        generatedAt: now,
      })
      return next
    })

    useInvoiceStore.getState().updateInvoice(invoiceId, { irnNumber: irn, irnStatus: 'generated' })
    addToast({ type: 'success', title: 'IRN Generated', message: inv.invoiceNumber })
  }

  const nowRef = useRef(Date.now)
  const handleCancel = useCallback((invoiceId: string) => {
    const rec = irnRecords.get(invoiceId)
    if (!rec) return
    const genTime = rec.generatedAt ? new Date(rec.generatedAt).getTime() : 0
    const hoursPassed = (nowRef.current() - genTime) / 3600000
    if (hoursPassed > 24) {
      addToast({ type: 'error', title: 'Cannot cancel', message: '24-hour cancellation window has passed' })
      return
    }
    setIrnRecords((prev) => {
      const next = new Map(prev)
      next.set(invoiceId, { ...(next.get(invoiceId)!), status: 'cancelled' })
      return next
    })
    useInvoiceStore.getState().updateInvoice(invoiceId, { irnNumber: null, irnStatus: null })
    addToast({ type: 'success', title: 'IRN Cancelled', message: rec.invoiceNumber })
  }, [irnRecords, addToast])

  const generated = [...irnRecords.values()].filter((r) => r.status === 'generated')
  const pending = eligibleInvoices.filter((i) => {
    const rec = irnRecords.get(i.id)
    return !rec || rec.status === 'pending'
  })

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="E-Invoice"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* Info banner */}
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--brand-50, #f0fdfa)', border: '1px solid var(--brand-200, #99f6e4)' }}>
          <Info className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-800">E-Invoicing Mandate</p>
            <p className="text-xs mt-0.5 text-brand-700">
              Businesses with aggregate turnover above ₹5 crore must generate IRN (Invoice Reference Number) from the IRP portal before issuing a tax invoice. The QR code must be printed on the invoice.
            </p>
          </div>
        </div>

        {/* Pending IRN */}
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Pending IRN Generation ({pending.length})</h3>
          </div>
          {pending.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-ok-500" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All eligible invoices have IRN generated</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  {['Invoice No.', 'Date', 'Customer', 'Amount', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((inv) => {
                  const rec = irnRecords.get(inv.id)
                  return (
                    <tr key={inv.id} className="h-11 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2 font-mono text-[12px] text-brand-600">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.invoiceDate)}</td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{inv.customerSnapshot.name}</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleGenerate(inv.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors">
                          <FileText className="w-3 h-3" /> Generate IRN
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Generated IRN archive */}
        {generated.length > 0 && (
          <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Generated IRNs ({generated.length})</h3>
            </div>
            <div className="flex flex-col">
              {generated.map((rec) => (
                <div key={rec.invoiceId} className="flex items-start gap-4 px-5 py-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  <CheckCircle2 className="w-5 h-5 text-ok-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-brand-600">{rec.invoiceNumber}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {rec.customerName}</span>
                      <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>· ₹{rec.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[11px] font-mono mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{rec.irn}</p>
                    {rec.generatedAt && (
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>Generated {formatDate(rec.generatedAt)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCancel(rec.invoiceId)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-err-50 hover:text-err-600 hover:border-err-200 transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <XCircle className="w-3 h-3" /> Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
