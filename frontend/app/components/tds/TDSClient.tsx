'use client'
import { useMemo } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { TopBar } from '../app/TopBar'
import { downloadCSV } from '@/lib/export/excelExport'
import { useUIStore } from '@/lib/store/uiStore'
import { formatDate } from '@/lib/utils/formatters'
import { Download } from 'lucide-react'

const TDS_SECTIONS = [
  { code: '194C', label: '194C — Contractors', rate: 1 },
  { code: '194J', label: '194J — Professional Services', rate: 10 },
  { code: '194H', label: '194H — Commission', rate: 5 },
  { code: '194I', label: '194I — Rent', rate: 10 },
  { code: '194B', label: '194B — Winnings', rate: 30 },
  { code: '194A', label: '194A — Interest', rate: 10 },
]

export function TDSClient() {
  const { invoices } = useInvoiceStore()
  const { addToast } = useUIStore()

  const tdsInvoices = useMemo(() =>
    invoices.filter((inv) => inv.tdsAmount && inv.tdsAmount > 0 && inv.status !== 'void'),
    [invoices]
  )

  const sectionTotals = useMemo(() => {
    const map: Record<string, { count: number; grossAmount: number; tdsAmount: number }> = {}
    for (const inv of tdsInvoices) {
      const sec = inv.tdsSection || 'OTHER'
      if (!map[sec]) map[sec] = { count: 0, grossAmount: 0, tdsAmount: 0 }
      map[sec].count++
      map[sec].grossAmount += inv.grandTotal
      map[sec].tdsAmount += inv.tdsAmount || 0
    }
    return map
  }, [tdsInvoices])

  const totalTds = Object.values(sectionTotals).reduce((s, v) => s + v.tdsAmount, 0)

  const handleExport = () => {
    const rows = tdsInvoices.map((inv) => ({
      'Invoice No': inv.invoiceNumber,
      'Date': formatDate(inv.invoiceDate),
      'Customer': inv.customerSnapshot.name,
      'Customer GSTIN': inv.customerSnapshot.gstin || '',
      'Gross Amount': inv.grandTotal,
      'TDS Section': inv.tdsSection || '',
      'TDS Rate %': inv.tdsRate || 0,
      'TDS Amount': inv.tdsAmount || 0,
      'Net Payable': inv.grandTotal - (inv.tdsAmount || 0),
    }))
    downloadCSV(rows, 'TDS_Register.csv')
    addToast({ type: 'success', title: 'TDS Register exported' })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="TDS Management"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            <Download className="w-3.5 h-3.5" /> Export TDS Register
          </button>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* Section summary */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(sectionTotals).map(([sec, data]) => (
            <div key={sec} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold text-brand-700">Section {sec}</p>
              <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-muted)' }}>{data.count} invoice{data.count > 1 ? 's' : ''}</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text)' }}>₹{data.tdsAmount.toLocaleString('en-IN')}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>on ₹{data.grossAmount.toLocaleString('en-IN')} gross</p>
            </div>
          ))}
          {tdsInvoices.length === 0 && (
            <div className="col-span-3 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No TDS deductions recorded yet. Add TDS section when creating B2B invoices.
            </div>
          )}
        </div>

        {/* TDS Register */}
        {tdsInvoices.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>TDS Register</h3>
              <span className="text-sm font-bold text-warn-600 tabular-nums">Total TDS: ₹{totalTds.toLocaleString('en-IN')}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Invoice No.', 'Date', 'Customer', 'Gross Amount', 'Section', 'TDS Rate', 'TDS Amount', 'Net Payable'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tdsInvoices.map((inv) => (
                    <tr key={inv.id} className="h-10 border-t hover:bg-ink-50/50" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2 font-mono text-[13px] text-brand-600">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.invoiceDate)}</td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{inv.customerSnapshot.name}</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2 text-[12px] font-mono text-brand-600">{inv.tdsSection}</td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{inv.tdsRate}%</td>
                      <td className="px-4 py-2 tabular-nums text-[13px] font-semibold text-warn-600">₹{(inv.tdsAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2 tabular-nums text-[13px] font-semibold text-ok-600">₹{(inv.grandTotal - (inv.tdsAmount || 0)).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
