'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useUIStore } from '@/lib/store/uiStore'
import { generateId } from '@/lib/utils/ids'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { AmountDisplay } from '../ui/AmountDisplay'
import { Plus, Trash2, Search, Save } from 'lucide-react'
import { HSNSuggestButton } from '../ai/HSNSuggestButton'
import type { Vendor, PurchaseInvoice, PurchaseLineItem } from '@/types/purchase'

function emptyLine(): PurchaseLineItem {
  return {
    id: generateId(), description: '', hsnSac: '',
    quantity: 1, unit: 'NOS', rate: 0, discountPercent: 0,
    taxableValue: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 0,
    totalAmount: 0, itcEligible: true,
  }
}

function calcLine(line: PurchaseLineItem, supplyType: 'intra' | 'inter'): PurchaseLineItem {
  const base = line.quantity * line.rate
  const disc = base * line.discountPercent / 100
  const taxableValue = Math.round((base - disc) * 100) / 100
  const gstAmt = Math.round(taxableValue * line.gstRate / 100 * 100) / 100
  const cgst = supplyType === 'intra' ? Math.round(gstAmt / 2 * 100) / 100 : 0
  const sgst = supplyType === 'intra' ? Math.round(gstAmt / 2 * 100) / 100 : 0
  const igst = supplyType === 'inter' ? gstAmt : 0
  return { ...line, taxableValue, cgst, sgst, igst, totalAmount: Math.round((taxableValue + gstAmt) * 100) / 100 }
}

export function PurchaseFormClient() {
  const router = useRouter()
  const { vendors, addPurchase, purchases } = usePurchaseStore()
  const { addToast } = useUIStore()

  const [vendorSearch, setVendorSearch] = useState('')
  const [showVendorDrop, setShowVendorDrop] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [supplyType, setSupplyType] = useState<'intra' | 'inter'>('intra')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<PurchaseLineItem[]>([emptyLine()])

  const vendorResults = useMemo(() => {
    if (!vendorSearch) return vendors.slice(0, 6)
    const q = vendorSearch.toLowerCase()
    return vendors.filter((v) =>
      v.name.toLowerCase().includes(q) ||
      v.businessName?.toLowerCase().includes(q) ||
      v.gstin?.toLowerCase().includes(q)
    ).slice(0, 6)
  }, [vendors, vendorSearch])

  const selectVendor = (v: Vendor) => {
    setSelectedVendor(v)
    setVendorSearch(v.businessName || v.name)
    setShowVendorDrop(false)
    const businessState = v.gstinState || ''
    setSupplyType(businessState === 'Maharashtra' ? 'intra' : 'inter')
  }

  const updateLine = (id: string, field: keyof PurchaseLineItem, value: string | number | boolean) => {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      return calcLine(updated, supplyType)
    }))
  }

  const totals = useMemo(() => {
    const taxableValue = lines.reduce((s, l) => s + l.taxableValue, 0)
    const cgstTotal = lines.reduce((s, l) => s + l.cgst, 0)
    const sgstTotal = lines.reduce((s, l) => s + l.sgst, 0)
    const igstTotal = lines.reduce((s, l) => s + l.igst, 0)
    const totalTax = cgstTotal + sgstTotal + igstTotal
    const grandTotal = Math.round(taxableValue + totalTax)
    const itcAvailable = lines.filter((l) => l.itcEligible).reduce((s, l) => s + l.cgst + l.sgst + l.igst, 0)
    return { taxableValue, cgstTotal, sgstTotal, igstTotal, totalTax, grandTotal, itcAvailable }
  }, [lines])

  const handleSave = (asDraft: boolean) => {
    if (!selectedVendor) { addToast({ type: 'error', title: 'Please select a vendor' }); return }
    if (!vendorInvoiceNumber.trim()) { addToast({ type: 'error', title: 'Vendor invoice number is required' }); return }
    const purchaseNum = `PUR-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, '0')}`
    const purchase: PurchaseInvoice = {
      id: generateId(),
      vendorInvoiceNumber: vendorInvoiceNumber.trim(),
      purchaseNumber: purchaseNum,
      status: asDraft ? 'draft' : 'recorded',
      vendorId: selectedVendor.id,
      vendorSnapshot: { name: selectedVendor.businessName || selectedVendor.name, gstin: selectedVendor.gstin, state: selectedVendor.gstinState || '' },
      supplyType,
      invoiceDate,
      lineItems: lines,
      subtotal: Math.round(lines.reduce((s, l) => s + l.quantity * l.rate, 0) * 100) / 100,
      taxableValue: Math.round(totals.taxableValue * 100) / 100,
      cgstTotal: Math.round(totals.cgstTotal * 100) / 100,
      sgstTotal: Math.round(totals.sgstTotal * 100) / 100,
      igstTotal: Math.round(totals.igstTotal * 100) / 100,
      totalTax: Math.round(totals.totalTax * 100) / 100,
      grandTotal: totals.grandTotal,
      itcAvailable: Math.round(totals.itcAvailable * 100) / 100,
      itcClaimed: 0,
      itcStatus: totals.itcAvailable > 0 ? 'eligible' : 'ineligible',
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addPurchase(purchase)
    addToast({ type: 'success', title: asDraft ? 'Purchase saved as draft' : 'Purchase recorded' })
    router.push('/purchases')
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="New Purchase"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Purchases', href: '/purchases' }]}
      />
      <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">

        {/* Vendor selector */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Vendor Details</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Vendor <span className="text-red-500">*</span></label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={vendorSearch}
                  onChange={(e) => { setVendorSearch(e.target.value); setShowVendorDrop(true) }}
                  onFocus={() => setShowVendorDrop(true)}
                  placeholder="Search vendors..."
                  className="w-full h-10 rounded-lg border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                  style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              {showVendorDrop && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowVendorDrop(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl py-1 max-h-48 overflow-y-auto"
                    style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                    {vendorResults.map((v) => (
                      <button key={v.id} onClick={() => selectVendor(v)}
                        className="flex flex-col w-full px-3 py-2 text-left hover:bg-ink-50 transition-colors">
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{v.businessName || v.name}</span>
                        {v.gstin && <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{v.gstin}</span>}
                      </button>
                    ))}
                    {vendorResults.length === 0 && (
                      <div className="px-3 py-2">
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No vendors found</p>
                        <Link href="/vendors/new" className="text-sm text-brand-600 hover:underline">Add new vendor →</Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <Input label="Vendor Invoice Number" value={vendorInvoiceNumber} onChange={(e) => setVendorInvoiceNumber(e.target.value)} placeholder="e.g. VEND/2025/001" required />
            <Input type="date" label="Invoice Date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
            <Select
              label="Supply Type"
              value={supplyType}
              onChange={(e) => setSupplyType(e.target.value as 'intra' | 'inter')}
              options={[{ value: 'intra', label: 'Intra-state (CGST + SGST)' }, { value: 'inter', label: 'Inter-state (IGST)' }]}
            />
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Disc%', 'GST%', 'Taxable', 'Tax', 'Total', 'ITC', ''].map((h) => (
                    <th key={h} className="pb-2 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)', paddingRight: '8px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-2"><input value={line.description} onChange={(e) => updateLine(line.id, 'description', e.target.value)} className="w-full min-w-[140px] h-8 px-2 rounded border text-sm outline-none focus:ring-1 focus:ring-brand-600/20" style={{ border: '1px solid var(--border)' }} placeholder="Description" /></td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-0.5">
                        <input value={line.hsnSac} onChange={(e) => updateLine(line.id, 'hsnSac', e.target.value)} className="w-20 h-8 px-2 rounded border text-sm outline-none font-mono focus:ring-1 focus:ring-brand-600/20" style={{ border: '1px solid var(--border)' }} />
                        <HSNSuggestButton
                          description={line.description}
                          itemType="product"
                          onApply={(code, rate) => { updateLine(line.id, 'hsnSac', code); updateLine(line.id, 'gstRate', rate) }}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={line.quantity} onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))} className="w-16 h-8 px-2 rounded border text-sm outline-none text-right focus:ring-1 focus:ring-brand-600/20" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input value={line.unit} onChange={(e) => updateLine(line.id, 'unit', e.target.value)} className="w-14 h-8 px-2 rounded border text-sm outline-none focus:ring-1 focus:ring-brand-600/20" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={line.rate} onChange={(e) => updateLine(line.id, 'rate', Number(e.target.value))} className="w-20 h-8 px-2 rounded border text-sm outline-none text-right focus:ring-1 focus:ring-brand-600/20" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" max="100" value={line.discountPercent} onChange={(e) => updateLine(line.id, 'discountPercent', Number(e.target.value))} className="w-14 h-8 px-2 rounded border text-sm outline-none text-right focus:ring-1 focus:ring-brand-600/20" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2">
                      <select value={line.gstRate} onChange={(e) => updateLine(line.id, 'gstRate', Number(e.target.value))} className="w-16 h-8 px-1 rounded border text-sm outline-none" style={{ border: '1px solid var(--border)' }}>
                        {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2 text-right text-xs" style={{ color: 'var(--text-2)' }}>{line.taxableValue.toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-2 text-right text-xs" style={{ color: 'var(--text-2)' }}>{(line.cgst + line.sgst + line.igst).toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-2 text-right text-sm font-medium" style={{ color: 'var(--text)' }}>{line.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-2">
                      <input type="checkbox" checked={line.itcEligible} onChange={(e) => updateLine(line.id, 'itcEligible', e.target.checked)} className="w-4 h-4 rounded" title="ITC Eligible" />
                    </td>
                    <td className="py-2">
                      <button onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))} disabled={lines.length === 1}
                        className="p-1 rounded hover:bg-err-50 disabled:opacity-30">
                        <Trash2 className="w-3.5 h-3.5 text-err-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setLines((prev) => [...prev, emptyLine()])}
            className="mt-3 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <Plus className="w-4 h-4" /> Add Line Item
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Internal notes..." />
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            {[
              { label: 'Taxable Value', value: totals.taxableValue },
              supplyType === 'intra' ? { label: 'CGST', value: totals.cgstTotal } : null,
              supplyType === 'intra' ? { label: 'SGST', value: totals.sgstTotal } : null,
              supplyType === 'inter' ? { label: 'IGST', value: totals.igstTotal } : null,
              { label: 'Total Tax', value: totals.totalTax },
              { label: 'Grand Total', value: totals.grandTotal, bold: true },
              { label: 'ITC Available', value: totals.itcAvailable, highlight: true },
            ].filter((x): x is NonNullable<typeof x> => x !== null).map(({ label, value, bold, highlight }) => (
              <div key={label} className={`flex justify-between py-1.5 ${bold ? 'border-t mt-1 pt-2.5 font-semibold' : ''}`} style={bold ? { borderColor: 'var(--border)' } : {}}>
                <span className="text-sm" style={{ color: highlight ? '#4F46E5' : bold ? 'var(--text)' : 'var(--text-2)' }}>{label}</span>
                <span style={{ color: highlight ? '#4F46E5' : undefined }}><AmountDisplay amount={value ?? 0} className={`text-sm ${bold ? 'font-bold text-base' : ''}`} /></span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          <button onClick={() => handleSave(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-ink-100 hover:bg-ink-200 transition-colors" style={{ color: 'var(--text)' }}>
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => handleSave(false)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
            Record Purchase
          </button>
        </div>
      </div>
    </div>
  )
}
