'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useItemStore } from '@/lib/store/itemStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { calculateLineItem, calculateInvoiceTotals } from '@/lib/gst/calculator'
import { formatAmountInWords, formatIndianCurrency } from '@/lib/gst/formatter'
import { determineSupplyType } from '@/lib/gst/validator'
import { generateId, generateInvoiceNumber } from '@/lib/utils/ids'
import { formatDate } from '@/lib/utils/formatters'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Modal } from '../ui/Modal'
import type { Invoice, LineItem, SupplyType } from '@/types/invoice'
import type { Customer } from '@/types/customer'
import { Plus, Trash2, Search, Send, Save, Eye, AlertTriangle } from 'lucide-react'
import { HSNSuggestButton } from '../ai/HSNSuggestButton'

interface InvoiceFormClientProps {
  editId?: string
}

function emptyLineItem(supplyType: SupplyType): LineItem {
  return {
    id: generateId(), itemId: null, description: '', hsnSac: '',
    quantity: 1, unit: 'NOS', rate: 0, discountPercent: 0,
    taxableValue: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 0, totalAmount: 0,
  }
}

export function InvoiceFormClient({ editId }: InvoiceFormClientProps) {
  const router = useRouter()
  const { invoices, addInvoice, updateInvoice } = useInvoiceStore()
  const { customers, searchCustomers } = useCustomerStore()
  const { items, searchItems } = useItemStore()
  const { profile, settings } = useBusinessStore()
  const { addToast } = useUIStore()

  const editingInvoice = editId ? invoices.find((i) => i.id === editId) : null

  const today = new Date().toISOString().split('T')[0]
  const defaultDue = new Date()
  defaultDue.setDate(defaultDue.getDate() + settings.invoiceSettings.duePeriodDays)

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    editingInvoice ? customers.find((c) => c.id === editingInvoice.customerId) || null : null
  )
  const [custSearch, setCustSearch] = useState('')
  const [showCustDropdown, setShowCustDropdown] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState(editingInvoice?.invoiceDate || today)
  const [dueDate, setDueDate] = useState(editingInvoice?.dueDate || defaultDue.toISOString().split('T')[0])
  const [notes, setNotes] = useState(editingInvoice?.notes || '')
  const [terms, setTerms] = useState(editingInvoice?.terms || settings.invoiceSettings.termsAndConditions)
  const [invoiceType, setInvoiceType] = useState<import('@/types/invoice').InvoiceType>(editingInvoice?.invoiceType ?? 'tax_invoice')
  const [lineItems, setLineItems] = useState<LineItem[]>(
    editingInvoice?.lineItems || [emptyLineItem('intra')]
  )
  const [showSendModal, setShowSendModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [showWarnings, setShowWarnings] = useState(false)
  const [pendingSaveStatus, setPendingSaveStatus] = useState<'draft' | 'sent' | null>(null)
  const [itemSearch, setItemSearch] = useState<Record<string, string>>({})
  const [showItemDropdown, setShowItemDropdown] = useState<Record<string, boolean>>({})

  const supplyType: SupplyType = useMemo(() => {
    if (!selectedCustomer) return 'intra'
    const buyerStateCode = selectedCustomer.gstinStateCode || selectedCustomer.billingAddress.stateCode
    return determineSupplyType(profile.stateCode, buyerStateCode)
  }, [selectedCustomer, profile.stateCode])

  const recalcLineItems = (items: LineItem[], st: SupplyType): LineItem[] =>
    items.map((li) => {
      const calc = calculateLineItem(li.quantity, li.rate, li.discountPercent, li.gstRate, st)
      return { ...li, ...calc }
    })

  useEffect(() => {
    setLineItems((prev) => recalcLineItems(prev, supplyType))
  }, [supplyType])

  const totals = useMemo(() => {
    const t = calculateInvoiceTotals(lineItems, supplyType)
    return { ...t, amountInWords: formatAmountInWords(t.grandTotal) }
  }, [lineItems, supplyType])

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => prev.map((li) => {
      if (li.id !== id) return li
      const updated = { ...li, [field]: value }
      const calc = calculateLineItem(updated.quantity, updated.rate, updated.discountPercent, updated.gstRate, supplyType)
      return { ...updated, ...calc }
    }))
  }

  const addLineItem = () => setLineItems((prev) => [...prev, emptyLineItem(supplyType)])
  const removeLineItem = (id: string) => setLineItems((prev) => prev.filter((li) => li.id !== id))

  const filteredCustomers = useMemo(() => {
    if (!custSearch) return customers.slice(0, 8)
    return searchCustomers(custSearch).slice(0, 8)
  }, [custSearch, customers, searchCustomers])

  const commitSave = (status: 'draft' | 'sent') => {
    if (!selectedCustomer) return
    setSaving(true)
    setShowWarnings(false)

    const invoiceNumber = editingInvoice?.invoiceNumber ||
      generateInvoiceNumber(settings.invoiceSettings.invoicePrefix, settings.invoiceSettings.currentCounter)

    const invoice: Invoice = {
      id: editingInvoice?.id || generateId(),
      invoiceNumber,
      invoiceType,
      status,
      customerId: selectedCustomer.id,
      customerSnapshot: {
        name: selectedCustomer.name,
        gstin: selectedCustomer.gstin,
        address: `${selectedCustomer.billingAddress.line1}, ${selectedCustomer.billingAddress.city}`,
        state: selectedCustomer.billingAddress.state,
        stateCode: selectedCustomer.billingAddress.stateCode,
      },
      supplyType,
      invoiceDate,
      dueDate,
      lineItems,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxableValue: totals.taxableValue,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      amountPaid: editingInvoice?.amountPaid ?? 0,
      balanceDue: Math.max(0, totals.grandTotal - (editingInvoice?.amountPaid ?? 0)),
      notes,
      terms,
      placeOfSupply: selectedCustomer.billingAddress.state,
      irnNumber: null,
      irnStatus: null,
      createdAt: editingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setTimeout(() => {
      if (editingInvoice) updateInvoice(editingInvoice.id, invoice)
      else addInvoice(invoice)
      setSaving(false)
      addToast({ type: 'success', title: status === 'draft' ? 'Draft saved' : 'Invoice created', message: invoiceNumber })
      if (status === 'sent') setShowSendModal(true)
      else router.push('/invoices')
    }, 600)
  }

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!selectedCustomer) { addToast({ type: 'error', title: 'Select a customer first' }); return }
    setPendingSaveStatus(status)
    try {
      const res = await fetch('/api/ai/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: lineItems.map((li) => ({
            description: li.description,
            hsnSac: li.hsnSac,
            gstRate: li.gstRate,
            discountPercent: li.discountPercent,
            rate: li.rate,
          })),
          customerType: selectedCustomer.gstin ? 'b2b' : 'b2c',
          invoiceType,
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
      // Validation failed silently — proceed without blocking
    }
    commitSave(status)
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={editingInvoice ? `Edit ${editingInvoice.invoiceNumber}` : 'New Invoice'}
        breadcrumb={[{ label: 'Invoices', href: '/invoices' }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => handleSave('draft')} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:bg-ink-50 disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Save className="w-3.5 h-3.5" /> Save Draft
            </button>
            <button onClick={() => handleSave('sent')} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save & Send'}
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form — 3/5 width */}
          <div className="lg:col-span-3 flex flex-col gap-5">

            {/* Invoice meta */}
            <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Invoice Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Invoice Number" value={editingInvoice?.invoiceNumber || generateInvoiceNumber(settings.invoiceSettings.invoicePrefix, settings.invoiceSettings.currentCounter)} readOnly />
                <Select label="Invoice Type" value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as import('@/types/invoice').InvoiceType)} options={[
                  { value: 'tax_invoice', label: 'Tax Invoice' },
                  { value: 'proforma', label: 'Proforma Invoice' },
                  { value: 'credit_note', label: 'Credit Note' },
                  { value: 'debit_note', label: 'Debit Note' },
                ]} />
                <Input label="Invoice Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
                <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
            </div>

            {/* Customer */}
            <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Bill To</h2>
              <div className="relative">
                <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Customer *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={selectedCustomer ? selectedCustomer.name : custSearch}
                    onChange={(e) => { setCustSearch(e.target.value); setSelectedCustomer(null); setShowCustDropdown(true) }}
                    onFocus={() => setShowCustDropdown(true)}
                    placeholder="Search customer..."
                    className="w-full h-10 rounded-lg border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
                {showCustDropdown && (
                  <div className="absolute top-full left-0 right-0 z-20 rounded-xl mt-1 overflow-hidden"
                    style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                    {filteredCustomers.map((c) => (
                      <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustDropdown(false); setCustSearch('') }}
                        className="flex items-start gap-3 w-full px-3 py-2.5 hover:bg-ink-50 text-left">
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {c.gstin || 'No GSTIN'} · {c.billingAddress.state}
                          </p>
                        </div>
                      </button>
                    ))}
                    <button onClick={() => { setShowCustDropdown(false); router.push('/customers/new') }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-brand-600 hover:bg-brand-50 border-t"
                      style={{ borderColor: 'var(--border)' }}>
                      <Plus className="w-3.5 h-3.5" /> Add new customer
                    </button>
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span style={{ color: 'var(--text-muted)' }}>GSTIN: </span><span className="font-mono font-medium" style={{ color: 'var(--text)' }}>{selectedCustomer.gstin || 'Unregistered'}</span></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>State: </span><span style={{ color: 'var(--text)' }}>{selectedCustomer.billingAddress.state}</span></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Supply: </span><span className={`font-semibold ${supplyType === 'intra' ? 'text-ok-600' : 'text-brand-600'}`}>{supplyType === 'intra' ? 'Intra-state (CGST+SGST)' : 'Inter-state (IGST)'}</span></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Type: </span><span style={{ color: 'var(--text)' }}>{selectedCustomer.businessType.toUpperCase()}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Line items */}
            <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Item / Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate (₹)', 'Disc%', 'GST%', 'Amount (₹)', ''].map((h) => (
                        <th key={h} className="px-3 py-2 text-[11px] font-semibold text-left uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li, idx) => (
                      <tr key={li.id} className="border-t" style={{ borderColor: 'var(--border-soft)' }}>
                        <td className="px-3 py-2 min-w-[180px]">
                          <div className="relative">
                            <input
                              value={itemSearch[li.id] !== undefined ? itemSearch[li.id] : li.description}
                              onChange={(e) => {
                                setItemSearch((prev) => ({ ...prev, [li.id]: e.target.value }))
                                setShowItemDropdown((prev) => ({ ...prev, [li.id]: true }))
                              }}
                              placeholder={`Item ${idx + 1}`}
                              className="w-full h-8 rounded-md border px-2 text-xs outline-none focus:ring-1 focus:ring-brand-600/20 focus:border-brand-600"
                              style={{ borderColor: 'var(--border)' }}
                            />
                            {showItemDropdown[li.id] && itemSearch[li.id] && (
                              <div className="absolute top-full left-0 z-30 w-60 rounded-xl mt-1 overflow-hidden"
                                style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                                {searchItems(itemSearch[li.id] || '').slice(0, 6).map((item) => (
                                  <button key={item.id} onClick={() => {
                                    setLineItems((prev) => prev.map((l) => {
                                      if (l.id !== li.id) return l
                                      const calc = calculateLineItem(l.quantity, item.defaultRate, l.discountPercent, item.defaultGstRate, supplyType)
                                      return { ...l, itemId: item.id, description: item.name, hsnSac: item.hsnCode || item.sacCode || '', rate: item.defaultRate, gstRate: item.defaultGstRate, unit: item.unit, ...calc }
                                    }))
                                    setItemSearch((prev) => ({ ...prev, [li.id]: '' }))
                                    setShowItemDropdown((prev) => ({ ...prev, [li.id]: false }))
                                  }} className="flex flex-col w-full px-3 py-2 hover:bg-ink-50 text-left">
                                    <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{item.name}</span>
                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.hsnCode || item.sacCode} · GST {item.defaultGstRate}%</span>
                                  </button>
                                ))}
                                {searchItems(itemSearch[li.id] || '').length === 0 && (
                                  <button onClick={() => { setShowItemDropdown((prev) => ({ ...prev, [li.id]: false })); router.push('/items/new') }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 border-t text-left"
                                    style={{ borderColor: 'var(--border)' }}>
                                    <Plus className="w-3.5 h-3.5" /> Add new item →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-0.5">
                            <input value={li.hsnSac} onChange={(e) => updateLineItem(li.id, 'hsnSac', e.target.value)}
                              placeholder="HSN/SAC" className="w-20 h-8 rounded-md border px-2 text-xs outline-none focus:ring-1 focus:ring-brand-600/20"
                              style={{ borderColor: 'var(--border)' }} />
                            <HSNSuggestButton
                              description={li.description}
                              itemType={li.itemId ? 'product' : 'service'}
                              onApply={(code, rate) => { updateLineItem(li.id, 'hsnSac', code); updateLineItem(li.id, 'gstRate', rate) }}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="0.01" step="0.01" value={li.quantity}
                            onChange={(e) => updateLineItem(li.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-14 h-8 rounded-md border px-2 text-xs text-right tabular-nums outline-none focus:ring-1 focus:ring-brand-600/20"
                            style={{ borderColor: 'var(--border)' }} />
                        </td>
                        <td className="px-2 py-2">
                          <select value={li.unit} onChange={(e) => updateLineItem(li.id, 'unit', e.target.value)}
                            className="w-16 h-8 rounded-md border px-1 text-xs outline-none"
                            style={{ borderColor: 'var(--border)' }}>
                            {['NOS', 'KGS', 'MTR', 'LTR', 'HRS', 'DAYS', 'PCS', 'BOX'].map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="0" step="0.01" value={li.rate}
                            onChange={(e) => updateLineItem(li.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-20 h-8 rounded-md border px-2 text-xs text-right tabular-nums outline-none focus:ring-1 focus:ring-brand-600/20"
                            style={{ borderColor: 'var(--border)' }} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="0" max="100" step="0.5" value={li.discountPercent}
                            onChange={(e) => updateLineItem(li.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                            className="w-14 h-8 rounded-md border px-2 text-xs text-right tabular-nums outline-none focus:ring-1 focus:ring-brand-600/20"
                            style={{ borderColor: 'var(--border)' }} />
                        </td>
                        <td className="px-2 py-2">
                          <select value={li.gstRate} onChange={(e) => updateLineItem(li.id, 'gstRate', Number(e.target.value))}
                            className="w-16 h-8 rounded-md border px-1 text-xs outline-none"
                            style={{ borderColor: 'var(--border)' }}>
                            {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-xs font-medium" style={{ color: 'var(--text)' }}>
                          ₹{li.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeLineItem(li.id)} disabled={lineItems.length === 1}
                            className="p-1 rounded hover:bg-err-50 text-err-600 disabled:opacity-20 transition-colors" aria-label="Remove item">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
                <button onClick={addLineItem}
                  className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Add Line Item
                </button>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Notes & Terms</h2>
              <div className="flex flex-col gap-3">
                <Textarea label="Notes (visible on invoice)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thank you for your business!" rows={2} />
                <Textarea label="Terms & Conditions" value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} />
              </div>
            </div>
          </div>

          {/* Summary panel — 2/5 width */}
          <div className="lg:col-span-2">
            <div className="sticky top-20 rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Invoice Summary</h2>
                {selectedCustomer && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {supplyType === 'intra' ? 'CGST + SGST applicable (Intra-state)' : 'IGST applicable (Inter-state)'}
                  </p>
                )}
              </div>
              <div className="px-5 py-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                  <span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Discount</span>
                    <span className="tabular-nums text-ok-600">−₹{totals.discountAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium" style={{ borderTop: '1px dashed var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text)' }}>Taxable Value</span>
                  <span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{totals.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                {supplyType === 'intra' ? (
                  <>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>CGST</span>
                      <span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{totals.cgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>SGST</span>
                      <span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{totals.sgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>IGST</span>
                    <span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{totals.igstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {totals.roundOff !== 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Round off</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 px-3 rounded-lg mt-2"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span className="font-bold text-base" style={{ color: 'var(--text)' }}>Total</span>
                  <span className="font-bold text-xl tabular-nums text-brand-700">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                </div>

                <p className="text-[11px] italic text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                  {totals.amountInWords}
                </p>
              </div>

              {/* GST breakdown per rate */}
              {lineItems.some((li) => li.gstRate > 0) && (
                <div className="px-5 pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>GST Breakdown by Rate</p>
                  {[0, 5, 12, 18, 28].filter((r) => lineItems.some((li) => li.gstRate === r && r > 0)).map((rate) => {
                    const rateItems = lineItems.filter((li) => li.gstRate === rate)
                    const taxable = rateItems.reduce((s, li) => s + li.taxableValue, 0)
                    const gst = rateItems.reduce((s, li) => s + li.cgst + li.sgst + li.igst, 0)
                    return (
                      <div key={rate} className="flex justify-between text-xs py-1">
                        <span style={{ color: 'var(--text-muted)' }}>GST {rate}% on ₹{taxable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {showWarnings && validationWarnings.length > 0 && (
                <div className="mx-5 mb-3 rounded-lg p-3" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
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
                      onClick={() => { if (pendingSaveStatus) commitSave(pendingSaveStatus) }}
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

              <div className="px-5 pb-5 flex flex-col gap-2">
                <button onClick={() => handleSave('sent')} disabled={saving || !selectedCustomer}
                  className="w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> {saving ? 'Saving...' : 'Save & Send Invoice'}
                </button>
                <button onClick={() => handleSave('draft')} disabled={saving}
                  className="w-full h-10 rounded-lg border text-sm font-medium transition-colors hover:bg-ink-50 disabled:opacity-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send modal */}
      <Modal open={showSendModal} onClose={() => { setShowSendModal(false); router.push('/invoices') }} title="Send Invoice" size="md">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Invoice has been saved. Choose how to send it:</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '📧', label: 'Email', sub: selectedCustomer?.email || 'No email' },
              { icon: '💬', label: 'WhatsApp', sub: selectedCustomer?.phone || 'No phone' },
              { icon: '🔗', label: 'Copy Link', sub: 'Share payment link' },
              { icon: '📥', label: 'Download PDF', sub: 'Save locally' },
            ].map(({ icon, label, sub }) => (
              <button key={label}
                onClick={() => { setShowSendModal(false); router.push('/invoices'); addToast({ type: 'success', title: `${label} option selected (demo)` }) }}
                className="flex flex-col items-center gap-1 p-4 rounded-xl border hover:border-brand-400 hover:bg-brand-50 transition-colors"
                style={{ borderColor: 'var(--border)' }}>
                <span className="text-2xl">{icon}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
