'use client'
import { useState } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { ScanSearch, Loader2, AlertTriangle, CheckCircle, X } from 'lucide-react'
import type { AnomalyIssue } from '@/app/api/ai/gstr1-anomaly/route'

interface AnomalyResult {
  issues: AnomalyIssue[]
  summary: string
}

const SEVERITY_STYLE = {
  error: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  warning: { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
}

export function AnomalyDetectorCard() {
  const { invoices } = useInvoiceStore()
  const { profile } = useBusinessStore()
  const [result, setResult] = useState<AnomalyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const handleScan = async () => {
    setLoading(true)
    setError(null)
    setDismissed(new Set())

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const period = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

    const thisMonthInvoices = invoices.filter((inv) => {
      const d = new Date(inv.invoiceDate)
      return d.getMonth() + 1 === month && d.getFullYear() === year
    })

    const totalTaxable = thisMonthInvoices.reduce((s, i) => s + i.taxableValue, 0)
    const totalTax = thisMonthInvoices.reduce((s, i) => s + i.cgstTotal + i.sgstTotal + i.igstTotal, 0)

    const b2bEntries = thisMonthInvoices
      .filter((inv) => inv.customerSnapshot.gstin)
      .map((inv) => ({
        customerGstin: inv.customerSnapshot.gstin ?? '',
        customerName: inv.customerSnapshot.name,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        taxableValue: inv.taxableValue,
        cgst: inv.cgstTotal,
        sgst: inv.sgstTotal,
        igst: inv.igstTotal,
        placeOfSupply: inv.customerSnapshot.state,
      }))

    const hsnMap = new Map<string, { description: string; taxableValue: number; gstRate: number }>()
    thisMonthInvoices.forEach((inv) => {
      inv.lineItems.forEach((li) => {
        const key = li.hsnSac || 'MISSING'
        const existing = hsnMap.get(key)
        if (existing) {
          existing.taxableValue += li.taxableValue
        } else {
          hsnMap.set(key, { description: li.description, taxableValue: li.taxableValue, gstRate: li.gstRate })
        }
      })
    })
    const hsnSummary = Array.from(hsnMap.entries()).map(([hsnCode, v]) => ({ hsnCode, ...v }))

    const b2cTotals = {
      taxableValue: thisMonthInvoices.filter((i) => !i.customerSnapshot.gstin).reduce((s, i) => s + i.taxableValue, 0),
      igst: thisMonthInvoices.filter((i) => !i.customerSnapshot.gstin).reduce((s, i) => s + i.igstTotal, 0),
    }

    try {
      const res = await fetch('/api/ai/gstr1-anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          b2bEntries,
          hsnSummary,
          b2cTotals,
          businessState: profile?.billingAddress?.state ?? '',
          totalTaxable,
          totalTax,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as AnomalyResult
      setResult(data)
    } catch {
      setError('Could not scan for anomalies. Check AI configuration.')
    } finally {
      setLoading(false)
    }
  }

  const visibleIssues = result?.issues.filter((_, i) => !dismissed.has(i)) ?? []

  return (
    <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScanSearch className="w-4 h-4 text-rose-500" />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>GST Anomaly Scan</h3>
          {result && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={visibleIssues.length === 0
                ? { background: '#ECFDF5', color: '#059669' }
                : { background: '#FEF2F2', color: '#DC2626' }}>
              {visibleIssues.length === 0 ? 'Clean' : `${visibleIssues.length} issue${visibleIssues.length !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
        <button onClick={() => void handleScan()} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          style={{ background: loading ? 'var(--surface)' : '#FFF1F2', color: '#E11D48', border: '1px solid #FECDD3' }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
          {loading ? 'Scanning…' : result ? 'Re-Scan' : 'Scan Now'}
        </button>
      </div>

      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <ScanSearch className="w-8 h-8 text-rose-100" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Scan this month&apos;s GSTR-1 data for GST anomalies</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Scanning for anomalies…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-err-50 text-err-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-3">
          {/* Summary */}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{result.summary}</p>

          {visibleIssues.length === 0 && (
            <div className="flex items-center gap-2 py-3 px-3 rounded-lg" style={{ background: '#ECFDF5', border: '1px solid #86EFAC' }}>
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-700">No anomalies found in this month&apos;s GSTR-1 data.</span>
            </div>
          )}

          {visibleIssues.map((issue, i) => {
            const originalIdx = result.issues.indexOf(issue)
            const s = SEVERITY_STYLE[issue.severity]
            return (
              <div key={originalIdx} className="rounded-lg p-3"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: 'white', color: s.text, border: `1px solid ${s.border}` }}>
                      {issue.severity.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold mb-0.5" style={{ color: s.text }}>{issue.category}</p>
                      <p className="text-[11px] leading-relaxed" style={{ color: s.text }}>{issue.message}</p>
                      <p className="text-[11px] mt-1 opacity-80" style={{ color: s.text }}>Fix: {issue.fix}</p>
                    </div>
                  </div>
                  <button onClick={() => setDismissed((prev) => new Set([...prev, originalIdx]))}
                    className="p-0.5 rounded hover:opacity-70 flex-shrink-0 mt-0.5" style={{ color: s.text }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
