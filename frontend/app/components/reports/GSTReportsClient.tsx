'use client'
import { useState, useMemo } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { TopBar } from '../app/TopBar'
import { Tabs } from '../ui/Tabs'
import { KpiCard } from '../ui/KpiCard'
import { calculateGSTR1Summary } from '@/lib/gst/gstr1'
import { calculateGSTR3BSummary } from '@/lib/gst/gstr3b'
import { formatDate } from '@/lib/utils/formatters'
import { useUIStore } from '@/lib/store/uiStore'
import { Download, FileText } from 'lucide-react'
import { ReportInsights } from '../ai/ReportInsights'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PIE_COLORS = ['#0d9488', '#14b8a6', '#5eead4', '#99f6e4', '#ccfbf1']

type TabKey = 'gstr1' | 'gstr3b' | 'tax-summary' | 'einvoice-status'

export function GSTReportsClient({ defaultTab = 'gstr1' }: { defaultTab?: TabKey }) {
  const { invoices } = useInvoiceStore()
  const { addToast } = useUIStore()

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab)

  const period = { month: selectedMonth, year: selectedYear }

  const gstr1 = useMemo(() => calculateGSTR1Summary(invoices, period), [invoices, selectedMonth, selectedYear])
  const gstr3b = useMemo(() => calculateGSTR3BSummary(invoices, [], period), [invoices, selectedMonth, selectedYear])

  const handleDownload = (format: string) => {
    addToast({ type: 'success', title: `${format} exported`, message: `${activeTab.toUpperCase()} data for ${MONTHS[selectedMonth - 1]} ${selectedYear}` })
  }

  // Derived values
  const b2bTaxableValue = gstr1.b2b.reduce((s, e) => s + e.taxableValue, 0)
  const b2csTaxableValue = gstr1.b2cs.reduce((s, e) => s + e.taxableValue, 0)
  const netTaxPayable = gstr3b.taxLiability.netPayableTotal
  const totalOutputTax = gstr3b.taxLiability.totalOutput
  const netItc = gstr3b.itcAvailable.netItc

  // Tax summary data
  const last6Months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(selectedYear, selectedMonth - 1 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const monthInvs = invoices.filter((inv) => {
        if (inv.status === 'void' || inv.status === 'draft') return false
        const id = new Date(inv.invoiceDate)
        return id.getMonth() + 1 === m && id.getFullYear() === y
      })
      const taxable = monthInvs.reduce((s, i) => s + i.taxableValue, 0)
      const gstAmt = monthInvs.reduce((s, i) => s + i.cgstTotal + i.sgstTotal + i.igstTotal, 0)
      return { name: MONTHS[m - 1], taxable, gst: gstAmt }
    }).reverse()
  }, [invoices, selectedMonth, selectedYear])

  const rateWise = useMemo(() => {
    const map: Record<number, number> = {}
    invoices.forEach((inv) => {
      if (inv.status === 'void' || inv.status === 'draft') return
      const d = new Date(inv.invoiceDate)
      if (d.getMonth() + 1 !== selectedMonth || d.getFullYear() !== selectedYear) return
      inv.lineItems.forEach((li) => {
        map[li.gstRate] = (map[li.gstRate] || 0) + li.taxableValue
      })
    })
    return Object.entries(map).map(([rate, value]) => ({ name: `${rate}%`, value }))
  }, [invoices, selectedMonth, selectedYear])

  const hsnWise = useMemo(() => {
    const map: Record<string, { taxable: number; gst: number }> = {}
    invoices.forEach((inv) => {
      if (inv.status === 'void' || inv.status === 'draft') return
      const d = new Date(inv.invoiceDate)
      if (d.getMonth() + 1 !== selectedMonth || d.getFullYear() !== selectedYear) return
      inv.lineItems.forEach((li) => {
        const key = li.hsnSac || 'N/A'
        if (!map[key]) map[key] = { taxable: 0, gst: 0 }
        map[key].taxable += li.taxableValue
        map[key].gst += li.cgst + li.sgst + li.igst
      })
    })
    return Object.entries(map)
      .map(([hsn, v]) => ({ hsn, ...v }))
      .sort((a, b) => b.taxable - a.taxable)
      .slice(0, 10)
  }, [invoices, selectedMonth, selectedYear])

  const tabs = [
    { key: 'gstr1', label: 'GSTR-1' },
    { key: 'gstr3b', label: 'GSTR-3B' },
    { key: 'tax-summary', label: 'Tax Summary' },
    { key: 'einvoice-status', label: 'E-Invoice Status' },
  ]

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="GST Reports"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => handleDownload('JSON')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
            <button onClick={() => handleDownload('Excel')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-5 pt-4 pb-0">
            <Tabs tabs={tabs} activeKey={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />
          </div>

          {/* GSTR-1 */}
          {activeTab === 'gstr1' && (
            <div className="p-5 flex flex-col gap-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard title="B2B Invoices" value={gstr1.b2b.length} subtext="Registered buyers" />
                <KpiCard title="B2C Supplies" value={b2csTaxableValue} isAmount subtext="Unregistered" />
                <KpiCard title="Total Taxable" value={gstr1.totals.taxableValue} isAmount />
                <KpiCard title="Total Tax" value={gstr1.totals.totalTax} isAmount />
              </div>

              {/* B2B Section */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>B2B — Supplies to Registered Persons ({gstr1.b2b.length})</h3>
                  <span className="tabular-nums text-sm font-semibold text-brand-600">
                    ₹{b2bTaxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                {gstr1.b2b.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No B2B supplies this period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Receiver GSTIN', 'Name', 'Invoice No.', 'Date', 'POS', 'Taxable', 'CGST', 'SGST', 'IGST'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gstr1.b2b.map((entry) => (
                          <tr key={entry.invoiceId} className="h-10 border-t hover:bg-ink-50/50" style={{ borderColor: 'var(--border-soft)' }}>
                            <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{entry.customerGstin}</td>
                            <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{entry.customerName}</td>
                            <td className="px-4 py-2 font-mono text-[12px] text-brand-600">{entry.invoiceNumber}</td>
                            <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(entry.invoiceDate)}</td>
                            <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{entry.placeOfSupply}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px] text-right" style={{ color: 'var(--text)' }}>₹{entry.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px] text-right" style={{ color: 'var(--text-muted)' }}>₹{entry.cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px] text-right" style={{ color: 'var(--text-muted)' }}>₹{entry.sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px] text-right" style={{ color: 'var(--text-muted)' }}>₹{entry.igst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* B2C Section */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>B2CS — Supplies to Unregistered ({gstr1.b2cs.length})</h3>
                </div>
                {gstr1.b2cs.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No B2C supplies this period</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Place of Supply', 'GST Rate', 'Taxable Value', 'IGST'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1.b2cs.map((entry, i) => (
                        <tr key={i} className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                          <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{entry.placeOfSupply}</td>
                          <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{entry.applicableTaxRate}%</td>
                          <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{entry.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text-muted)' }}>₹{entry.igst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* HSN Summary */}
              {gstr1.hsn.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>HSN / SAC Summary ({gstr1.hsn.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['HSN/SAC', 'Description', 'UOM', 'Qty', 'Taxable', 'CGST', 'SGST', 'IGST'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gstr1.hsn.map((h) => (
                          <tr key={h.hsnCode} className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                            <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{h.hsnCode}</td>
                            <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>{h.description}</td>
                            <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{h.uom}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>{h.totalQuantity}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{h.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text-muted)' }}>₹{h.cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text-muted)' }}>₹{h.sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text-muted)' }}>₹{h.igst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GSTR-3B */}
          {activeTab === 'gstr3b' && (
            <div className="p-5 flex flex-col gap-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard title="Outward Inter-State" value={gstr3b.section31.outwardTaxableInterState.taxableValue} isAmount />
                <KpiCard title="Outward Intra-State" value={gstr3b.section31.outwardTaxableIntraState.taxableValue} isAmount />
                <KpiCard title="Total Output Tax" value={totalOutputTax} isAmount />
                <KpiCard title="Net Tax Payable" value={netTaxPayable} isAmount subtextColor={netTaxPayable > 0 ? 'warn' : 'default'} />
              </div>

              {/* Section 3.1 */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>3.1 — Outward Taxable Supplies</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Nature', 'Taxable Value', 'IGST', 'CGST', 'SGST/UTGST'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>Inter-state supplies</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{gstr3b.section31.outwardTaxableInterState.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{gstr3b.section31.outwardTaxableInterState.igst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>—</td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>—</td>
                    </tr>
                    <tr className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>Intra-state supplies</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{gstr3b.section31.outwardTaxableIntraState.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>—</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{gstr3b.section31.outwardTaxableIntraState.cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{gstr3b.section31.outwardTaxableIntraState.sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>Zero-rated supplies</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{gstr3b.section31.zeroRated.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td colSpan={3} className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>—</td>
                    </tr>
                    <tr className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>Exempt supplies</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{gstr3b.section31.exempt.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td colSpan={3} className="px-4 py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ITC Section 4 */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>4 — Eligible ITC (Input Tax Credit)</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Details', 'IGST', 'CGST', 'SGST'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>ITC on B2B purchases</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{gstr3b.taxLiability.itcIgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{gstr3b.taxLiability.itcCgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{gstr3b.taxLiability.itcSgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="h-10 border-t font-semibold" style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}>
                      <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--text)' }}>Net ITC Available</td>
                      <td colSpan={3} className="px-4 py-2 tabular-nums text-[13px] text-ok-600">₹{netItc.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Payable Summary */}
              <div className="rounded-xl p-5 flex justify-end" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-72 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Total Output Tax</span>
                    <span className="tabular-nums font-medium" style={{ color: 'var(--text)' }}>₹{totalOutputTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Less: ITC</span>
                    <span className="tabular-nums text-ok-600">−₹{netItc.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text)' }}>Net Tax Payable</span>
                    <span className={`tabular-nums ${netTaxPayable > 0 ? 'text-warn-600' : 'text-ok-600'}`}>
                      ₹{netTaxPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tax Summary */}
          {activeTab === 'tax-summary' && (
            <div className="p-5 flex flex-col gap-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard title="Total Taxable Value" value={last6Months.reduce((s, m) => s + m.taxable, 0)} isAmount />
                <KpiCard title="Total GST Collected" value={last6Months.reduce((s, m) => s + m.gst, 0)} isAmount />
                <KpiCard title="CGST" value={invoices.filter((i) => !['void','draft'].includes(i.status)).reduce((s,i) => s + i.cgstTotal, 0)} isAmount />
                <KpiCard title="IGST" value={invoices.filter((i) => !['void','draft'].includes(i.status)).reduce((s,i) => s + i.igstTotal, 0)} isAmount />
              </div>

              {/* Revenue bar chart */}
              <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>GST Trend — Last 6 Months</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={last6Months} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: any) => [`₹${Number(v ?? 0).toLocaleString('en-IN')}`, ''] as any} />
                      <Bar dataKey="taxable" fill="#e2f8f6" name="Taxable" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="gst" fill="#0d9488" name="GST" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                {/* Rate-wise pie */}
                <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Rate-wise Distribution</h3>
                  {rateWise.length === 0 ? (
                    <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No data this period</div>
                  ) : (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={rateWise} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                            label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                            {rateWise.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => [`₹${Number(v ?? 0).toLocaleString('en-IN')}`, 'Taxable Value'] as any} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* HSN-wise table */}
                <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Top HSN/SAC by Value</h3>
                  </div>
                  {hsnWise.length === 0 ? (
                    <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No data this period</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                          {['HSN/SAC', 'Taxable', 'GST'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hsnWise.map((row) => (
                          <tr key={row.hsn} className="h-10 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                            <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{row.hsn}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px]" style={{ color: 'var(--text)' }}>₹{row.taxable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                            <td className="px-4 py-2 tabular-nums text-[13px] text-ok-600">₹{row.gst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* E-Invoice Status */}
          {activeTab === 'einvoice-status' && (
            <div className="p-5 flex flex-col gap-4">
              <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                <FileText className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>E-Invoice Threshold: ₹5 Crore turnover</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>E-invoicing is mandatory for businesses with aggregate turnover above ₹5 crore. IRN (Invoice Reference Number) must be generated before raising a tax invoice.</p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>IRN Status — {MONTHS[selectedMonth - 1]} {selectedYear}</h3>
                </div>
                <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  E-invoice generation is not required at the current turnover level.
                  <br />Go to the <a href="/einvoice" className="text-brand-600 hover:text-brand-700 font-medium">E-Invoice module</a> to manage IRN generation.
                </div>
              </div>
            </div>
          )}
        </div>

        <ReportInsights
          gstr1={gstr1}
          gstr3b={gstr3b}
          period={{ month: selectedMonth, year: selectedYear, label: `${MONTHS[selectedMonth - 1]} ${selectedYear}` }}
        />
      </div>
    </div>
  )
}
