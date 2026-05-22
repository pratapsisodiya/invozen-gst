'use client'
import { useMemo } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useFilingStore } from '@/lib/store/filingStore'
import { calculateHealthScore } from '@/lib/gst/healthScore'
import { ShieldCheck, AlertTriangle, XCircle } from 'lucide-react'
import Link from 'next/link'

export function ComplianceHealthCard() {
  const { invoices } = useInvoiceStore()
  const { purchases } = usePurchaseStore()
  const { records: filings } = useFilingStore()

  const result = useMemo(
    () => calculateHealthScore(invoices, purchases, filings),
    [invoices, purchases, filings]
  )

  const gradeColor = result.grade === 'A' ? 'text-ok-600' : result.grade === 'B' ? 'text-ok-500' : result.grade === 'C' ? 'text-warn-600' : 'text-err-600'
  const barColor = result.overall >= 75 ? '#0d9488' : result.overall >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="rounded-xl bg-white p-5 flex flex-col gap-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>GST Compliance Health</h3>
        <Link href="/compliance" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View Details →</Link>
      </div>

      {/* Score dial */}
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center w-20 h-20">
          <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
            <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle cx="40" cy="40" r="32" fill="none" stroke={barColor} strokeWidth="8"
              strokeDasharray={`${(result.overall / 100) * 201} 201`}
              strokeLinecap="round" />
          </svg>
          <div className="text-center z-10">
            <p className={`text-xl font-bold tabular-nums ${gradeColor}`}>{result.grade}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{result.overall}/100</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2">
          {Object.entries(result.breakdown).map(([key, item]) => (
            <div key={key} className="flex items-center gap-2">
              {item.status === 'good'
                ? <ShieldCheck className="w-3.5 h-3.5 text-ok-600 flex-shrink-0" />
                : item.status === 'warn'
                  ? <AlertTriangle className="w-3.5 h-3.5 text-warn-600 flex-shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-err-600 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[11px] truncate" style={{ color: 'var(--text-2)' }}>{item.label}</span>
                  <span className="text-[11px] tabular-nums font-medium" style={{ color: 'var(--text-muted)' }}>{item.score}/{item.max}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-1 rounded-full transition-all"
                    style={{ width: `${(item.score / item.max) * 100}%`, background: item.status === 'good' ? '#0d9488' : item.status === 'warn' ? '#d97706' : '#dc2626' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {result.suggestions.slice(0, 2).map((suggestion, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] px-2.5 py-1.5 rounded-lg"
              style={{ background: 'var(--surface)', color: 'var(--text-2)' }}>
              <AlertTriangle className="w-3 h-3 text-warn-600 flex-shrink-0 mt-0.5" />
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
