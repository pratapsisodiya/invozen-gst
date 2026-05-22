'use client'
import { useState, useMemo } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { TopBar } from '../app/TopBar'
import { calculateGSTR9Summary } from '@/lib/gst/gstr9'
import { calculateGSTR1Summary } from '@/lib/gst/gstr1'
import { calculateGSTR3BSummary } from '@/lib/gst/gstr3b'
import { downloadCSV, downloadJSON } from '@/lib/export/excelExport'
import { useUIStore } from '@/lib/store/uiStore'
import { Download } from 'lucide-react'
import { GSTR9AssistantClient } from './GSTR9AssistantClient'

function AmtCell({ v }: { v: number }) {
  return <td className="px-4 py-2.5 text-right tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
}

export function GSTR9Client() {
  const { invoices } = useInvoiceStore()
  const { purchases } = usePurchaseStore()
  const { addToast } = useUIStore()
  const currentYear = new Date().getFullYear()
  const [fyYear, setFyYear] = useState(currentYear - 1)

  const summary = useMemo(() => calculateGSTR9Summary(invoices, purchases, fyYear), [invoices, purchases, fyYear])

  // Build 12-month summaries for AI assistant (Apr fyYear to Mar fyYear+1)
  const gstr1Summaries = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = ((3 + i) % 12) + 1
      const year = i < 9 ? fyYear : fyYear + 1
      return { month, year }
    })
    return months.map((p) => calculateGSTR1Summary(invoices, p))
  }, [invoices, fyYear])

  const gstr3bSummaries = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = ((3 + i) % 12) + 1
      const year = i < 9 ? fyYear : fyYear + 1
      return { month, year }
    })
    return months.map((p) => calculateGSTR3BSummary(invoices, purchases, p))
  }, [invoices, purchases, fyYear])

  const handleExportCSV = () => {
    const rows = [
      { Table: '4A', Description: 'B2B Supplies', TaxableValue: summary.table4.b2bTaxable, CGST: '', SGST: '', IGST: '' },
      { Table: '4B', Description: 'B2C Supplies', TaxableValue: summary.table4.b2cTaxable, CGST: '', SGST: '', IGST: '' },
      { Table: '4D', Description: 'Nil-Rated Supplies', TaxableValue: summary.table4.nilRated, CGST: '', SGST: '', IGST: '' },
      { Table: '4E', Description: 'Exempted Supplies', TaxableValue: summary.table4.exempted, CGST: '', SGST: '', IGST: '' },
      { Table: '6B', Description: 'ITC on B2B Purchases', TaxableValue: '', CGST: summary.table6.itcOnB2B.cgst, SGST: summary.table6.itcOnB2B.sgst, IGST: summary.table6.itcOnB2B.igst },
      { Table: '6E', Description: 'ITC Reversed', TaxableValue: '', CGST: summary.table6.itcReversed.cgst, SGST: summary.table6.itcReversed.sgst, IGST: summary.table6.itcReversed.igst },
      { Table: '9', Description: 'Net Tax Payable', TaxableValue: '', CGST: summary.table9.netPayableCgst, SGST: summary.table9.netPayableSgst, IGST: summary.table9.netPayableIgst },
    ]
    downloadCSV(rows as unknown as Record<string, unknown>[], `GSTR9_${fyYear}-${(fyYear + 1).toString().slice(-2)}.csv`)
    addToast({ type: 'success', title: 'GSTR-9 CSV downloaded' })
  }

  const handleExportJSON = () => {
    downloadJSON(summary, `GSTR9_${fyYear}-${(fyYear + 1).toString().slice(-2)}.json`)
    addToast({ type: 'success', title: 'GSTR-9 JSON downloaded' })
  }

  const fyOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i)

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="GSTR-9 Annual Return"
        breadcrumb={[{ label: 'Reports', href: '/reports/gstr1' }]}
        actions={
          <div className="flex items-center gap-2">
            <select value={fyYear} onChange={(e) => setFyYear(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {fyOptions.map((y) => <option key={y} value={y}>{y}-{String(y + 1).slice(-2)}</option>)}
            </select>
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={handleExportJSON} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Financial Year: {summary.financialYear}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Annual return covering April {fyYear} to March {fyYear + 1} · Due 31 Dec {fyYear + 1}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Turnover</p>
            <p className="text-lg font-bold tabular-nums text-brand-700">₹{summary.turnover.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Table 4 — Outward Supplies */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Table 4 — Outward Supplies</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Table', 'Description', 'Taxable Value', 'CGST', 'SGST', 'IGST'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['4A', 'Supplies to registered persons (B2B)', summary.table4.b2bTaxable, summary.table4.totalCgst / 2, summary.table4.totalSgst / 2, summary.table4.totalIgst / 2],
                ['4B', 'Supplies to unregistered (B2C)', summary.table4.b2cTaxable, summary.table4.totalCgst / 2, summary.table4.totalSgst / 2, summary.table4.totalIgst / 2],
                ['4D', 'Nil-rated / zero-rated', summary.table4.nilRated, 0, 0, 0],
                ['4E', 'Exempted', summary.table4.exempted, 0, 0, 0],
              ].map(([table, desc, taxable, cgst, sgst, igst]) => (
                <tr key={String(table)} className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  <td className="px-4 py-2 font-mono text-[12px] text-brand-600">{table}</td>
                  <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{desc}</td>
                  <AmtCell v={Number(taxable)} />
                  <AmtCell v={Number(cgst)} />
                  <AmtCell v={Number(sgst)} />
                  <AmtCell v={Number(igst)} />
                </tr>
              ))}
              <tr className="border-t font-bold" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <td colSpan={2} className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--text)' }}>Total Outward Supplies</td>
                <AmtCell v={summary.table4.totalOutward} />
                <AmtCell v={summary.table4.totalCgst} />
                <AmtCell v={summary.table4.totalSgst} />
                <AmtCell v={summary.table4.totalIgst} />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 6 — ITC */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Table 6 — Input Tax Credit</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Table', 'Description', 'IGST', 'CGST', 'SGST'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['6B', 'ITC on inward supplies (other than imports)', summary.table6.itcOnB2B.igst, summary.table6.itcOnB2B.cgst, summary.table6.itcOnB2B.sgst],
                ['6E', 'ITC Reversed', summary.table6.itcReversed.igst, summary.table6.itcReversed.cgst, summary.table6.itcReversed.sgst],
                ['6J', 'Net ITC Available', summary.table6.netItc.igst, summary.table6.netItc.cgst, summary.table6.netItc.sgst],
              ].map(([table, desc, igst, cgst, sgst]) => (
                <tr key={String(table)} className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  <td className="px-4 py-2 font-mono text-[12px] text-brand-600">{table}</td>
                  <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{desc}</td>
                  <AmtCell v={Number(igst)} />
                  <AmtCell v={Number(cgst)} />
                  <AmtCell v={Number(sgst)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI GSTR-9 Assistant */}
        <GSTR9AssistantClient
          gstr1Summaries={gstr1Summaries}
          gstr3bSummaries={gstr3bSummaries}
          financialYear={summary.financialYear}
        />

        {/* Table 9 — Net Tax */}
        <div className="rounded-xl p-5 flex justify-end" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-72 flex flex-col gap-2 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Table 9 — Tax Payable</p>
            {[['Output IGST', summary.table9.outputIgst], ['Output CGST', summary.table9.outputCgst], ['Output SGST', summary.table9.outputSgst]].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span className="tabular-nums">₹{Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between text-ok-600">
              <span>ITC (Total)</span>
              <span className="tabular-nums">−₹{(summary.table9.itcIgst + summary.table9.itcCgst + summary.table9.itcSgst).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)' }}>Net Payable</span>
              <span className={`tabular-nums ${summary.table9.totalNetPayable > 0 ? 'text-warn-600' : 'text-ok-600'}`}>
                ₹{summary.table9.totalNetPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
