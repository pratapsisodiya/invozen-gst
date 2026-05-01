'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuotationStore } from '@/lib/store/quotationStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { calculateLineItem, calculateInvoiceTotals } from '@/lib/gst/calculator'
import { generateId } from '@/lib/utils/ids'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { AmountDisplay } from '../ui/AmountDisplay'
import { Plus, Trash2, Search, Save, Send, AlertTriangle } from 'lucide-react'
import { HSNSuggestButton } from '../ai/HSNSuggestButton'
import type { Quotation } from '@/types/quotation'
import type { LineItem, SupplyType } from '@/types/invoice'
import type { Customer } from '@/types/customer'

function emptyLine(): LineItem {
  return { id: generateId(), itemId: null, description: '', hsnSac: '', quantity: 1, unit: 'NOS', rate: 0, discountPercent: 0, taxableValue: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 0, totalAmount: 0 }
}

export function QuotationFormClient() {
  const router = useRouter()
  const { quotations, addQuotation } = useQuotationStore()
  const { customers } = useCustomerStore()
  const { settings } = useBusinessStore()
  const { addToast } = useUIStore()

  const today = new Date().toISOString().split('T')[0]
  const defaultValid = new Date()
  defaultValid.setDate(defaultValid.getDate() + 30)

  const [custSearch, setCustSearch] = useState('')
  const [showCustDrop, setShowCustDrop] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [quotationDate, setQuotationDate] = useState(today)
  const [validUntil, setValidUntil] = useState(defaultValid.toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState(settings.invoiceSettings.termsAndConditions)
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [showWarnings, setShowWarnings] = useState(false)
  const [pendingSaveAsDraft, setPendingSaveAsDraft] = useState<boolean | null>(null)

  const supplyType: SupplyType = selectedCustomer?.gstinState === 'Maharashtra' ? 'intra' : 'inter'

  const custResults = useMemo(() => {
    if (!custSearch) return customers.slice(0, 6)
    const q = custSearch.toLowerCase()
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.businessName?.toLowerCase().includes(q) || c.gstin?.toLowerCase().includes(q)).slice(0, 6)
  }, [customers, custSearch])

  const updateLine = (id: string, field: keyof LineItem, value: string | number) => {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      const calc = calculateLineItem(updated.quantity, updated.rate, updated.discountPercent, updated.gstRate, supplyType)
      return { ...updated, ...calc }
    }))
  }

  const totals = useMemo(() => calculateInvoiceTotals(lines, supplyType), [lines, supplyType])

  const commitSave = (asDraft: boolean) => {
    if (!selectedCustomer) return
    setShowWarnings(false)
    const qtNum = `QT-${new Date().getFullYear()}-${String(quotations.length + 1).padStart(3, '0')}`
    const quotation: Quotation = {
      id: generateId(),
      quotationNumber: qtNum,
      status: asDraft ? 'draft' : 'sent',
      customerId: selectedCustomer.id,
      customerSnapshot: {
        name: selectedCustomer.businessName || selectedCustomer.name,
        gstin: selectedCustomer.gstin,
        address: selectedCustomer.billingAddress.line1 + ', ' + selectedCustomer.billingAddress.city,
        state: selectedCustomer.billingAddress.state,
        stateCode: selectedCustomer.billingAddress.stateCode,
      },
      supplyType,
      quotationDate,
      validUntil,
      lineItems: lines,
      subtotal: Math.round(lines.reduce((s, l) => s + l.quantity * l.rate, 0) * 100) / 100,
      discountAmount: Math.round(lines.reduce((s, l) => s + l.quantity * l.rate * l.discountPercent / 100, 0) * 100) / 100,
      taxableValue: Math.round(totals.taxableValue * 100) / 100,
      cgstTotal: Math.round(totals.cgstTotal * 100) / 100,
      sgstTotal: Math.round(totals.sgstTotal * 100) / 100,
      igstTotal: Math.round(totals.igstTotal * 100) / 100,
      totalTax: Math.round(totals.totalTax * 100) / 100,
      grandTotal: totals.grandTotal,
      notes,
      terms,
      convertedToInvoiceId: null,
      convertedToInvoiceNumber: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addQuotation(quotation)
    addToast({ type: 'success', title: asDraft ? 'Quotation saved as draft' : 'Quotation marked as sent' })
    router.push('/quotations')
  }

  const handleSave = async (asDraft: boolean) => {
    if (!selectedCustomer) { addToast({ type: 'error', title: 'Please select a customer' }); return }
    setPendingSaveAsDraft(asDraft)
    try {
      const res = await fetch('/api/ai/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: lines.map((l) => ({
            description: l.description,
            hsnSac: l.hsnSac,
            gstRate: l.gstRate,
            discountPercent: l.discountPercent,
            rate: l.rate,
          })),
          customerType: selectedCustomer.gstin ? 'b2b' : 'b2c',
          invoiceType: 'tax_invoice',
        }),
      })
      if (res.ok) {
        const data = await res.json() as { warnings: string[] }
        if (data.warnings.length > 0) {
          setValidationWarnings(data.warnings)
          setShowWarnings(true)
          return
        }
      }
    } catch {
      // Proceed without blocking if validation fails
    }
    commitSave(asDraft)
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="New Quotation" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Quotations', href: '/quotations' }]} />
      <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">

        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Quotation Details</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Customer <span className="text-red-500">*</span></label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input value={custSearch} onChange={(e) => { setCustSearch(e.target.value); setShowCustDrop(true) }} onFocus={() => setShowCustDrop(true)}
                  placeholder="Search customers..." className="w-full h-10 rounded-lg border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                  style={{ border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              {showCustDrop && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCustDrop(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl py-1 max-h-48 overflow-y-auto"
                    style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                    {custResults.map((c) => (
                      <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustSearch(c.businessName || c.name); setShowCustDrop(false) }}
                        className="flex flex-col w-full px-3 py-2 text-left hover:bg-ink-50">
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.businessName || c.name}</span>
                        {c.gstin && <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{c.gstin}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Input type="date" label="Quotation Date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} required />
            <Input type="date" label="Valid Until" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
            {selectedCustomer && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  State: {selectedCustomer.billingAddress.state} · Supply: {supplyType === 'intra' ? 'Intra-state' : 'Inter-state'}
                  {selectedCustomer.gstin && <> · GSTIN: {selectedCustomer.gstin}</>}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Disc%', 'GST%', 'Taxable', 'Tax', 'Total', ''].map((h) => (
                    <th key={h} className="pb-2 text-left text-[11px] font-semibold uppercase pr-2" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-2"><input value={l.description} onChange={(e) => updateLine(l.id, 'description', e.target.value)} className="w-full min-w-[140px] h-8 px-2 rounded border text-sm outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} placeholder="Description" /></td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-0.5">
                        <input value={l.hsnSac} onChange={(e) => updateLine(l.id, 'hsnSac', e.target.value)} className="w-20 h-8 px-2 rounded border text-sm outline-none font-mono focus:ring-1" style={{ border: '1px solid var(--border)' }} />
                        <HSNSuggestButton
                          description={l.description}
                          itemType="service"
                          onApply={(code, rate) => { updateLine(l.id, 'hsnSac', code); updateLine(l.id, 'gstRate', rate) }}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={l.quantity} onChange={(e) => updateLine(l.id, 'quantity', Number(e.target.value))} className="w-16 h-8 px-2 rounded border text-sm text-right outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input value={l.unit} onChange={(e) => updateLine(l.id, 'unit', e.target.value)} className="w-14 h-8 px-2 rounded border text-sm outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={l.rate} onChange={(e) => updateLine(l.id, 'rate', Number(e.target.value))} className="w-20 h-8 px-2 rounded border text-sm text-right outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" max="100" value={l.discountPercent} onChange={(e) => updateLine(l.id, 'discountPercent', Number(e.target.value))} className="w-14 h-8 px-2 rounded border text-sm text-right outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><select value={l.gstRate} onChange={(e) => updateLine(l.id, 'gstRate', Number(e.target.value))} className="w-16 h-8 px-1 rounded border text-sm outline-none" style={{ border: '1px solid var(--border)' }}>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</select></td>
                    <td className="py-2 pr-2 text-right text-xs" style={{ color: 'var(--text-2)' }}>{l.taxableValue.toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-2 text-right text-xs" style={{ color: 'var(--text-2)' }}>{(l.cgst + l.sgst + l.igst).toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-2 text-right text-sm font-medium" style={{ color: 'var(--text)' }}>{l.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="py-2"><button onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))} disabled={lines.length === 1} className="p-1 rounded hover:bg-err-50 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5 text-err-500" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setLines((p) => [...p, emptyLine()])} className="mt-3 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <Plus className="w-4 h-4" /> Add Line Item
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            <Textarea label="Terms & Conditions" value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} />
          </div>
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            {[
              { label: 'Subtotal', value: lines.reduce((s, l) => s + l.quantity * l.rate, 0) },
              { label: 'Discount', value: lines.reduce((s, l) => s + l.quantity * l.rate * l.discountPercent / 100, 0) },
              { label: 'Taxable Value', value: totals.taxableValue },
              supplyType === 'intra' ? { label: 'CGST', value: totals.cgstTotal } : null,
              supplyType === 'intra' ? { label: 'SGST', value: totals.sgstTotal } : null,
              supplyType === 'inter' ? { label: 'IGST', value: totals.igstTotal } : null,
              { label: 'Total Tax', value: totals.totalTax },
              { label: 'Grand Total', value: totals.grandTotal, bold: true },
            ].filter((x): x is NonNullable<typeof x> => x !== null).map(({ label, value, bold }) => (
              <div key={label} className={`flex justify-between py-1.5 ${bold ? 'border-t mt-1 pt-2.5 font-semibold' : ''}`} style={bold ? { borderColor: 'var(--border)' } : {}}>
                <span className="text-sm" style={{ color: bold ? 'var(--text)' : 'var(--text-2)' }}>{label}</span>
                <AmountDisplay amount={value ?? 0} className={`text-sm ${bold ? 'font-bold text-base' : ''}`} />
              </div>
            ))}
          </div>
        </div>

        {showWarnings && validationWarnings.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-yellow-700">AI Validation Warnings</p>
            </div>
            <ul className="space-y-1 mb-3">
              {validationWarnings.map((w, i) => (
                <li key={i} className="text-xs" style={{ color: 'var(--text-2)' }}>• {w}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => { if (pendingSaveAsDraft !== null) commitSave(pendingSaveAsDraft) }}
                className="text-xs px-2.5 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white font-medium transition-colors">
                Save Anyway
              </button>
              <button
                onClick={() => setShowWarnings(false)}
                className="text-xs px-2.5 py-1 rounded border font-medium hover:bg-ink-50 transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                Fix Issues
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          <button onClick={() => handleSave(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-ink-100 hover:bg-ink-200 transition-colors" style={{ color: 'var(--text)' }}>
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => handleSave(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
