'use client'
import { useState, useCallback } from 'react'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { TopBar } from '../app/TopBar'
import { parseGSTR2BJSON, reconcileGSTR2B } from '@/lib/gst/gstr2b'
import type { GSTR2BReconciliationResult } from '@/lib/gst/gstr2b'
import { Upload, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export function GSTR2BReconciliationClient() {
  const { purchases } = usePurchaseStore()
  const [result, setResult] = useState<GSTR2BReconciliationResult | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file downloaded from the GST portal (GSTR-2B)')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const entries = parseGSTR2BJSON(text)
      if (entries.length === 0) {
        setError('No entries found in GSTR-2B JSON. Make sure it is a valid GST portal GSTR-2B download.')
        return
      }
      setError('')
      setResult(reconcileGSTR2B(purchases, entries))
    }
    reader.readAsText(file)
  }, [purchases])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="GSTR-2B Reconciliation" breadcrumb={[{ label: 'Reports', href: '/reports/gstr1' }]} />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-brand-400 bg-brand-50' : 'border-[var(--border)]'}`}>
          <Upload className="w-8 h-8 mx-auto mb-3 text-brand-600" />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Upload GSTR-2B JSON from GST Portal</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Download JSON from gstn.gov.in → Returns → GSTR-2B → Download</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium cursor-pointer transition-colors">
            <Upload className="w-4 h-4" /> Choose File
            <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
          </label>
          {error && <p className="mt-3 text-xs text-err-600">{error}</p>}
        </div>

        {result && (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-ok-600" />
                <p className="text-xl font-bold tabular-nums text-ok-600">{result.matched.length}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Matched</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-warn-600" />
                <p className="text-xl font-bold tabular-nums text-warn-600">{result.inBooksNotInGSTR2B.length}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>In Books, Not in GSTR-2B</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <XCircle className="w-5 h-5 mx-auto mb-1 text-err-600" />
                <p className="text-xl font-bold tabular-nums text-err-600">{result.inGSTR2BNotInBooks.length}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>In GSTR-2B, Not Recorded</p>
              </div>
            </div>

            {/* Matched invoices */}
            {result.matched.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold text-ok-700">Matched Invoices ({result.matched.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Vendor GSTIN', 'Invoice No.', 'Books Taxable', 'GSTR-2B Taxable', 'ITC Diff'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.matched.map((m, i) => {
                        const diff = m.igstDiff + m.cgstDiff + m.sgstDiff
                        return (
                          <tr key={i} className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                            <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{m.gstr2b.supplierGstin}</td>
                            <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{m.purchase.vendorInvoiceNumber}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{m.purchase.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{m.gstr2b.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className={`px-4 py-2 tabular-nums text-[13px] font-medium ${Math.abs(diff) > 1 ? 'text-warn-600' : 'text-ok-600'}`}>
                              {Math.abs(diff) < 0.01 ? '✓' : `₹${diff.toFixed(2)}`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Missing from GSTR-2B */}
            {result.inBooksNotInGSTR2B.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold text-warn-700">In Books, Missing from GSTR-2B ({result.inBooksNotInGSTR2B.length})</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Supplier may not have filed GSTR-1 yet. ITC cannot be claimed.</p>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {result.inBooksNotInGSTR2B.map((p) => (
                      <tr key={p.id} className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                        <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{p.vendorSnapshot.gstin || 'N/A'}</td>
                        <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{p.vendorInvoiceNumber}</td>
                        <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{p.grandTotal.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-[12px] text-warn-600">ITC at Risk</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* In GSTR-2B not in books */}
            {result.inGSTR2BNotInBooks.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold text-err-700">In GSTR-2B, Not Recorded ({result.inGSTR2BNotInBooks.length})</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>These purchases are visible in GSTR-2B but not recorded in your purchase register.</p>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {result.inGSTR2BNotInBooks.map((e, i) => (
                      <tr key={i} className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                        <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{e.supplierGstin}</td>
                        <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{e.supplierName}</td>
                        <td className="px-4 py-2 text-[13px] font-mono" style={{ color: 'var(--text)' }}>{e.invoiceNumber}</td>
                        <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{e.invoiceValue.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-[12px] text-err-600">Record Missing</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
