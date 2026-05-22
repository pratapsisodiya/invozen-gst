'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useItemStore } from '@/lib/store/itemStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { calculateLineItem, calculateInvoiceTotals, calculateTdsAmount } from '@/lib/gst/calculator'
import { formatAmountInWords, formatIndianCurrency } from '@/lib/gst/formatter'
import { determineSupplyType } from '@/lib/gst/validator'
import { generateId, generateInvoiceNumber } from '@/lib/utils/ids'
import { formatDate } from '@/lib/utils/formatters'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Modal } from '../ui/Modal'
import type { Invoice, LineItem, SupplyType } from '@/types/invoice'
import type { Customer } from '@/types/customer'
import { SUPPORTED_CURRENCIES } from '@/lib/currency/currencyUtils'
import { GST_RATES } from '@/lib/gst/constants'
import { CESS_RATES } from '@/lib/gst/cessRates'
import { TDS_SECTIONS } from '@/lib/gst/tdsSections'
import { Plus, Trash2, Search, Send, Save, AlertTriangle, Info } from 'lucide-react'
import { HSNSuggestButton } from '../ai/HSNSuggestButton'
import { AIAutofillButton } from '../ai/AIAutofillButton'

interface InvoiceFormClientProps {
  editId?: string
}

function emptyLineItem(supplyType: SupplyType): LineItem {
  return {
    id: generateId(), itemId: null, description: '', hsnSac: '',
    quantity: 1, unit: 'NOS', rate: 0, discountPercent: 0,
    taxableValue: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 0,
    cessRate: 0, cessAmount: 0, totalAmount: 0,
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
  const [currency, setCurrency] = useState(editingInvoice?.currency ?? 'INR')
  const [exchangeRate, setExchangeRate] = useState(editingInvoice?.exchangeRate ?? 1)
  const [itemSearch, setItemSearch] = useState<Record<string, string>>({})
  const [showItemDropdown, setShowItemDropdown] = useState<Record<string, boolean>>({})
  const [isFormActive, setIsFormActive] = useState(true)
  const [tdsSection, setTdsSection] = useState<string | null>(editingInvoice?.tdsSection ?? null)
  const [tdsRate, setTdsRate] = useState<number | null>(editingInvoice?.tdsRate ?? null)
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null)

  const draftKey = editId ? `invozen-draft-${editId}` : 'invozen-draft-new'
  const draftData = useMemo(() => ({
    selectedCustomerId: selectedCustomer?.id ?? null,
    invoiceDate, dueDate, notes, terms, invoiceType, lineItems, currency, exchangeRate,
  }), [selectedCustomer, invoiceDate, dueDate, notes, terms, invoiceType, lineItems, currency, exchangeRate])

  const { lastSavedAt, hasDraft, clearDraft, recoverDraft } = useAutoSave(draftKey, draftData, isFormActive)
  const [showDraftRecovery, setShowDraftRecovery] = useState(() => hasDraft && !editId)

  const supplyType: SupplyType = useMemo(() => {
    if (!selectedCustomer) return 'intra'
    const buyerStateCode = selectedCustomer.gstinStateCode || selectedCustomer.billingAddress.stateCode
    return determineSupplyType(profile.stateCode, buyerStateCode)
  }, [selectedCustomer, profile.stateCode])

  const recalcLineItems = (items: LineItem[], st: SupplyType): LineItem[] =>
    items.map((li) => {
      const calc = calculateLineItem(li.quantity, li.rate, li.discountPercent, li.gstRate, st, li.cessRate ?? 0)
      return { ...li, ...calc }
    })

  useEffect(() => {
    setLineItems((prev) => recalcLineItems(prev, supplyType))
  }, [supplyType])

  // Bill of Supply: zero out all GST when type switches
  useEffect(() => {
    if (invoiceType === 'bill_of_supply') {
      setLineItems((prev) => prev.map((li) => {
        const calc = calculateLineItem(li.quantity, li.rate, li.discountPercent, 0, supplyType, 0)
        return { ...li, gstRate: 0, ...calc }
      }))
    }
  }, [invoiceType])

  const totals = useMemo(() => {
    const t = calculateInvoiceTotals(lineItems, supplyType)
    return { ...t, amountInWords: formatAmountInWords(t.grandTotal) }
  }, [lineItems, supplyType])

  const creditLimitWarning = useMemo(() => {
    if (!selectedCustomer?.creditLimit) return null
    const outstanding = invoices
      .filter((i) => i.customerId === selectedCustomer.id && ['sent', 'overdue'].includes(i.status))
      .reduce((s, i) => s + i.balanceDue, 0)
    const projected = outstanding + totals.grandTotal
    if (projected > selectedCustomer.creditLimit) {
      return { outstanding, projected, limit: selectedCustomer.creditLimit, excess: projected - selectedCustomer.creditLimit }
    }
    return null
  }, [selectedCustomer, invoices, totals.grandTotal])

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => prev.map((li) => {
      if (li.id !== id) return li
      const updated = { ...li, [field]: value }
      const gstRateToUse = invoiceType === 'bill_of_supply' ? 0 : updated.gstRate
      const calc = calculateLineItem(updated.quantity, updated.rate, updated.discountPercent, gstRateToUse, supplyType, updated.cessRate ?? 0)
      return { ...updated, gstRate: gstRateToUse, ...calc }
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
        address: [selectedCustomer.billingAddress.line1, selectedCustomer.billingAddress.line2, selectedCustomer.billingAddress.city].filter(Boolean).join(', '),
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
      cessTotal: totals.cessTotal,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      amountPaid: editingInvoice?.amountPaid ?? 0,
      balanceDue: Math.max(0, totals.grandTotal - (editingInvoice?.amountPaid ?? 0)),
      notes,
      terms,
      placeOfSupply: selectedCustomer.billingAddress.state,
      irnNumber: editingInvoice?.irnNumber ?? null,
      irnStatus: editingInvoice?.irnStatus ?? null,
      tdsSection,
      tdsRate,
      tdsAmount: (tdsSection && tdsRate) ? calculateTdsAmount(totals.grandTotal, tdsRate) : null,
      amendedInvoiceId: editingInvoice?.amendedInvoiceId ?? null,
      amendedInvoiceNumber: editingInvoice?.amendedInvoiceNumber ?? null,
      amendmentReason: editingInvoice?.amendmentReason ?? null,
      currency,
      exchangeRate,
      attachmentIds: editingInvoice?.attachmentIds ?? [],
      createdAt: editingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (editingInvoice) updateInvoice(editingInvoice.id, invoice)
    else addInvoice(invoice)
    setSaving(false)
    setIsFormActive(false)
    clearDraft()
    setSavedInvoiceId(invoice.id)
    addToast({ type: 'success', title: status === 'draft' ? 'Draft saved' : 'Invoice created', message: invoiceNumber })
    if (status === 'sent') setShowSendModal(true)
    else router.push('/invoices')
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
      addToast({ type: 'error', title: 'Validation check unavailable — saving without AI review' })
    }
    commitSave(status)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useKeyboardShortcut('s', () => void handleSave('draft'), { meta: true, preventDefault: true })

  return (
    <div className="flex flex-col flex-1">
      {/* Draft recovery modal */}
      <Modal open={showDraftRecovery} onClose={() => { setShowDraftRecovery(false); clearDraft() }} title="Recover Unsaved Draft?" size="sm">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            A previous unsaved draft was found. Would you like to restore it?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const draft = recoverDraft()
                if (draft && typeof draft === 'object') {
                  const d = draft as typeof draftData
                  if (d.invoiceDate) setInvoiceDate(d.invoiceDate)
                  if (d.dueDate) setDueDate(d.dueDate)
                  if (d.notes !== undefined) setNotes(d.notes)
                  if (d.terms !== undefined) setTerms(d.terms)
                  if (d.lineItems?.length) setLineItems(d.lineItems)
                  if (d.currency) setCurrency(d.currency)
                  if (d.exchangeRate) setExchangeRate(d.exchangeRate)
                  if (d.selectedCustomerId) {
                    const c = customers.find((x) => x.id === d.selectedCustomerId)
                    if (c) setSelectedCustomer(c)
                  }
                }
                setShowDraftRecovery(false)
              }}
              className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">
              Restore Draft
            </button>
            <button onClick={() => { setShowDraftRecovery(false); clearDraft() }}
              className="flex-1 h-9 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Start Fresh
            </button>
          </div>
        </div>
      </Modal>

      <TopBar
        title={editingInvoice ? `Edit ${editingInvoice.invoiceNumber}` : 'New Invoice'}
        breadcrumb={[{ label: 'Invoices', href: '/invoices' }]}
        actions={
          <div className="flex items-center gap-2">
            {lastSavedAt && (
              <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Saved {Math.round((Date.now() - lastSavedAt.getTime()) / 1000)}s ago
              </span>
            )}
            <button onClick={() => void handleSave('draft')} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:bg-ink-50 disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Save className="w-3.5 h-3.5" /> Save Draft
            </button>
            <button onClick={() => void handleSave('sent')} disabled={saving}
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
                  { value: 'bill_of_supply', label: 'Bill of Supply' },
                  { value: 'proforma', label: 'Proforma Invoice' },
                  { value: 'credit_note', label: 'Credit Note' },
                  { value: 'debit_note', label: 'Debit Note' },
                ]} />
                <Input label="Invoice Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
                <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                <Select label="Currency" value={currency} onChange={(e) => { setCurrency(e.target.value); if (e.target.value === 'INR') setExchangeRate(1) }}
                  options={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))} />
                {currency !== 'INR' && (
                  <Input label={`Exchange Rate (1 ${currency} = ? INR)`} type="number" value={String(exchangeRate)}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)} />
                )}
              </div>
            </div>

            {/* Bill of Supply banner */}
            {invoiceType === 'bill_of_supply' && (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#EFF6FF', border: '1px solid #93C5FD' }}>
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Bill of Supply</span> — No GST is charged. For composition dealers and nil-rated/exempt supplies only. All GST rates have been set to 0%.
                </p>
              </div>
            )}

            {/* Amendment banner */}
            {editingInvoice?.amendedInvoiceId && (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">
                  <span className="font-semibold">Amendment</span> — Amending Invoice #{editingInvoice.amendedInvoiceNumber}. Reason: {editingInvoice.amendmentReason}
                </p>
              </div>
            )}

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
                <>
                  <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span style={{ color: 'var(--text-muted)' }}>GSTIN: </span><span className="font-mono font-medium" style={{ color: 'var(--text)' }}>{selectedCustomer.gstin || 'Unregistered'}</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>State: </span><span style={{ color: 'var(--text)' }}>{selectedCustomer.billingAddress.state}</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Supply: </span><span className={`font-semibold ${supplyType === 'intra' ? 'text-ok-600' : 'text-brand-600'}`}>{supplyType === 'intra' ? 'Intra-state (CGST+SGST)' : 'Inter-state (IGST)'}</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Type: </span><span style={{ color: 'var(--text)' }}>{selectedCustomer.businessType.toUpperCase()}</span></div>
                    </div>
                  </div>
                  {creditLimitWarning && (
                    <div className="mt-2 p-3 rounded-lg flex items-start gap-2" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-yellow-700">Credit Limit Warning</p>
                        <p className="text-yellow-600 mt-0.5">
                          This invoice will bring total exposure to ₹{creditLimitWarning.projected.toLocaleString('en-IN')} —
                          exceeding the ₹{creditLimitWarning.limit.toLocaleString('en-IN')} limit by ₹{creditLimitWarning.excess.toLocaleString('en-IN')}.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Line items */}
            <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Items</h2>
                {selectedCustomer && !editId && (
                  <AIAutofillButton
                    customer={selectedCustomer}
                    pastInvoices={invoices.filter((inv) => inv.customerId === selectedCustomer.id && inv.status !== 'void').slice(0, 5)}
                    items={items}
                    supplyType={supplyType}
                    onApply={(lines) => setLineItems(lines)}
                  />
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Item / Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate (₹)', 'Disc%', 'GST%', ...(lineItems.some((li) => li.gstRate === 28) ? ['Cess%'] : []), 'Amount (₹)', ''].map((h) => (
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
                                      // Reset discountPercent to 0 when selecting a new item
                                      const calc = calculateLineItem(l.quantity, item.defaultRate, 0, item.defaultGstRate, supplyType)
                                      return { ...l, itemId: item.id, description: item.name, hsnSac: item.hsnCode || item.sacCode || '', rate: item.defaultRate, gstRate: item.defaultGstRate, unit: item.unit, discountPercent: 0, ...calc }
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
                            onChange={(e) => { const v = parseFloat(e.target.value); updateLineItem(li.id, 'discountPercent', isNaN(v) ? 0 : v) }}
                            className="w-14 h-8 rounded-md border px-2 text-xs text-right tabular-nums outline-none focus:ring-1 focus:ring-brand-600/20"
                            style={{ borderColor: 'var(--border)' }} />
                        </td>
                        <td className="px-2 py-2">
                          <select value={li.gstRate} onChange={(e) => updateLineItem(li.id, 'gstRate', Number(e.target.value))}
                            disabled={invoiceType === 'bill_of_supply'}
                            className="w-16 h-8 rounded-md border px-1 text-xs outline-none disabled:opacity-50"
                            style={{ borderColor: 'var(--border)' }}>
                            {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        {li.gstRate === 28 && (
                          <td className="px-2 py-2">
                            <select value={li.cessRate ?? 0} onChange={(e) => updateLineItem(li.id, 'cessRate', Number(e.target.value))}
                              className="w-16 h-8 rounded-md border px-1 text-xs outline-none"
                              style={{ borderColor: 'var(--border)' }}>
                              {CESS_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </td>
                        )}
                        {li.gstRate !== 28 && lineItems.some((x) => x.gstRate === 28) && (
                          <td className="px-2 py-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>—</td>
                        )}
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

            {/* TDS Deduction (B2B only) */}
            {invoiceType === 'tax_invoice' && selectedCustomer?.gstin && (
              <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>TDS Deduction</h2>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Tax Deducted at Source — applicable for B2B transactions above threshold</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>TDS Section</label>
                    <select
                      value={tdsSection ?? ''}
                      onChange={(e) => {
                        const sec = e.target.value || null
                        setTdsSection(sec)
                        if (sec) {
                          const found = TDS_SECTIONS.find((s) => s.code === sec)
                          if (found) setTdsRate(found.rate)
                        } else {
                          setTdsRate(null)
                        }
                      }}
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <option value="">No TDS</option>
                      {TDS_SECTIONS.map((s) => (
                        <option key={s.code} value={s.code}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  {tdsSection && (
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>TDS Rate %</label>
                      <input
                        type="number" min="0" max="100" step="0.1"
                        value={tdsRate ?? ''}
                        onChange={(e) => setTdsRate(parseFloat(e.target.value) || null)}
                        className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
                        style={{ borderColor: 'var(--border)' }}
                      />
                    </div>
                  )}
                </div>
                {tdsSection && tdsRate && (
                  <p className="text-xs mt-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                    TDS deduction: ₹{calculateTdsAmount(totals.grandTotal, tdsRate).toLocaleString('en-IN', { maximumFractionDigits: 2 })} |
                    Net payable by customer: ₹{(totals.grandTotal - calculateTdsAmount(totals.grandTotal, tdsRate)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}
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

                {totals.cessTotal > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Cess</span>
                    <span className="tabular-nums" style={{ color: 'var(--text)' }}>₹{totals.cessTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {totals.roundOff !== 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Round off</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
                  </div>
                )}

                {tdsSection && tdsRate && (
                  <div className="flex justify-between text-err-600">
                    <span>Less: TDS ({tdsSection})</span>
                    <span className="tabular-nums">−₹{calculateTdsAmount(totals.grandTotal, tdsRate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 px-3 rounded-lg mt-2"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span className="font-bold text-base" style={{ color: 'var(--text)' }}>
                    {tdsSection && tdsRate ? 'Net Payable' : 'Total'}
                  </span>
                  <span className="font-bold text-xl tabular-nums text-brand-700">
                    ₹{(tdsSection && tdsRate
                      ? totals.grandTotal - calculateTdsAmount(totals.grandTotal, tdsRate)
                      : totals.grandTotal
                    ).toLocaleString('en-IN')}
                  </span>
                </div>

                <p className="text-[11px] italic text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                  {totals.amountInWords}
                </p>
              </div>

              {/* GST breakdown per rate */}
              {lineItems.some((li) => li.gstRate > 0) && (
                <div className="px-5 pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>GST Breakdown by Rate</p>
                  {GST_RATES.filter((r) => r > 0 && lineItems.some((li) => li.gstRate === r)).map((rate) => {
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
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Invoice saved. Choose how to send it to <strong>{selectedCustomer?.name}</strong>:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                if (!savedInvoiceId || !selectedCustomer?.email) {
                  addToast({ type: 'error', title: 'No email address for this customer' }); return
                }
                try {
                  const res = await fetch(`/api/invoices/${savedInvoiceId}/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to: selectedCustomer.email }),
                  })
                  const data = await res.json() as { sent?: boolean; reason?: string; error?: string }
                  if (!res.ok) throw new Error(data.error || 'Send failed')
                  addToast({ type: 'success', title: data.sent ? `Email sent to ${selectedCustomer.email}` : 'Marked as sent', message: data.reason })
                  setShowSendModal(false); router.push('/invoices')
                } catch (err) {
                  addToast({ type: 'error', title: 'Could not send email', message: String(err) })
                }
              }}
              className="flex flex-col items-center gap-1 p-4 rounded-xl border hover:border-brand-400 hover:bg-brand-50 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <span className="text-2xl">📧</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Email</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedCustomer?.email || 'No email on file'}</span>
            </button>
            <button
              onClick={() => {
                if (!selectedCustomer?.phone) { addToast({ type: 'error', title: 'No phone for this customer' }); return }
                const msg = `Dear ${selectedCustomer.name},\n\nPlease find your invoice attached.\n\nKindly arrange payment at the earliest. Thank you!`
                window.open(`https://wa.me/91${selectedCustomer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
                setShowSendModal(false); router.push('/invoices')
              }}
              className="flex flex-col items-center gap-1 p-4 rounded-xl border hover:border-brand-400 hover:bg-brand-50 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <span className="text-2xl">💬</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>WhatsApp</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedCustomer?.phone || 'No phone on file'}</span>
            </button>
            <button
              onClick={async () => {
                if (!savedInvoiceId) return
                try {
                  const { useBusinessStore } = await import('@/lib/store/businessStore')
                  const { settings } = useBusinessStore.getState()
                  const { useInvoiceStore } = await import('@/lib/store/invoiceStore')
                  const inv = useInvoiceStore.getState().invoices.find((i) => i.id === savedInvoiceId)
                  if (!inv) return
                  const { downloadInvoicePdf } = await import('@/lib/pdf/invoicePdf')
                  await downloadInvoicePdf(inv, profile, settings)
                  addToast({ type: 'success', title: 'PDF downloaded' })
                  setShowSendModal(false); router.push('/invoices')
                } catch { addToast({ type: 'error', title: 'PDF generation failed' }) }
              }}
              className="flex flex-col items-center gap-1 p-4 rounded-xl border hover:border-brand-400 hover:bg-brand-50 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <span className="text-2xl">📥</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Download PDF</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Save locally</span>
            </button>
            <button
              onClick={() => { setShowSendModal(false); router.push('/invoices') }}
              className="flex flex-col items-center gap-1 p-4 rounded-xl border hover:border-brand-400 hover:bg-brand-50 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <span className="text-2xl">✓</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Done</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Skip sending</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
