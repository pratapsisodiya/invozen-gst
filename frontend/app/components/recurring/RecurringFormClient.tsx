'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useRecurringStore } from '@/lib/store/recurringStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useUIStore } from '@/lib/store/uiStore'
import { generateId } from '@/lib/utils/ids'
import { calculateLineItem } from '@/lib/gst/calculator'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { AmountDisplay } from '../ui/AmountDisplay'
import { Plus, Trash2, Search, Save } from 'lucide-react'
import { FREQUENCY_LABELS } from '@/types/recurring'
import type { RecurringFrequency, RecurringTemplate } from '@/types/recurring'
import type { LineItem, SupplyType } from '@/types/invoice'
import type { Customer } from '@/types/customer'

function emptyLine(): LineItem {
  return { id: generateId(), itemId: null, description: '', hsnSac: '', quantity: 1, unit: 'NOS', rate: 0, discountPercent: 0, taxableValue: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 0, totalAmount: 0 }
}

export function RecurringFormClient() {
  const router = useRouter()
  const { templates, addTemplate } = useRecurringStore()
  const { customers } = useCustomerStore()
  const { addToast } = useUIStore()

  const [name, setName] = useState('')
  const [custSearch, setCustSearch] = useState('')
  const [showCustDrop, setShowCustDrop] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [customDays, setCustomDays] = useState(30)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [autoSend, setAutoSend] = useState(false)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due within 30 days.')
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])

  const supplyType: SupplyType = selectedCustomer?.gstinState === 'Maharashtra' ? 'intra' : 'inter'

  const custResults = useMemo(() => {
    if (!custSearch) return customers.slice(0, 6)
    const q = custSearch.toLowerCase()
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.businessName?.toLowerCase().includes(q)).slice(0, 6)
  }, [customers, custSearch])

  const updateLine = (id: string, field: keyof LineItem, value: string | number) => {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      const calc = calculateLineItem(updated.quantity, updated.rate, updated.discountPercent, updated.gstRate, supplyType)
      return { ...updated, ...calc }
    }))
  }

  const totals = useMemo(() => ({
    grandTotal: Math.round(lines.reduce((s, l) => s + l.totalAmount, 0)),
  }), [lines])

  const handleSave = () => {
    if (!name.trim()) { addToast({ type: 'error', title: 'Template name is required' }); return }
    if (!selectedCustomer) { addToast({ type: 'error', title: 'Please select a customer' }); return }
    const template: RecurringTemplate = {
      id: generateId(),
      name: name.trim(),
      status: 'active',
      customerId: selectedCustomer.id,
      customerSnapshot: {
        name: selectedCustomer.businessName || selectedCustomer.name,
        gstin: selectedCustomer.gstin,
        address: selectedCustomer.billingAddress.line1 + ', ' + selectedCustomer.billingAddress.city,
        state: selectedCustomer.billingAddress.state,
        stateCode: selectedCustomer.billingAddress.stateCode,
      },
      frequency,
      customDays: frequency === 'custom' ? customDays : null,
      startDate,
      endDate: endDate || null,
      nextGenerationDate: startDate,
      autoSend,
      lineItems: lines,
      notes,
      terms,
      totalGenerated: 0,
      lastGeneratedAt: null,
      pausedReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addTemplate(template)
    addToast({ type: 'success', title: 'Recurring template created' })
    router.push('/recurring')
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="New Recurring Template" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Recurring', href: '/recurring' }]} />
      <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">

        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Template Settings</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Input label="Template Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly Cloud Retainer" required />
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
                        className="flex flex-col w-full px-3 py-2 text-left hover:bg-ink-50 transition-colors">
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.businessName || c.name}</span>
                        {c.gstin && <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{c.gstin}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Select
              label="Frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
              options={Object.entries(FREQUENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
            {frequency === 'custom' && (
              <Input type="number" label="Every N days" value={String(customDays)} onChange={(e) => setCustomDays(Number(e.target.value))} min="1" />
            )}
            <Input type="date" label="Start Date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            <Input type="date" label="End Date (optional)" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <div className="flex items-center gap-3 col-span-full">
              <input type="checkbox" id="autoSend" checked={autoSend} onChange={(e) => setAutoSend(e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="autoSend" className="text-sm" style={{ color: 'var(--text-2)' }}>Auto-mark as Sent when generated</label>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Description', 'Qty', 'Unit', 'Rate', 'Disc%', 'GST%', 'Total', ''].map((h) => (
                    <th key={h} className="pb-2 text-left text-[11px] font-semibold uppercase pr-2" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-2"><input value={l.description} onChange={(e) => updateLine(l.id, 'description', e.target.value)} className="w-full min-w-[140px] h-8 px-2 rounded border text-sm outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} placeholder="Description" /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={l.quantity} onChange={(e) => updateLine(l.id, 'quantity', Number(e.target.value))} className="w-16 h-8 px-2 rounded border text-sm text-right outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input value={l.unit} onChange={(e) => updateLine(l.id, 'unit', e.target.value)} className="w-14 h-8 px-2 rounded border text-sm outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={l.rate} onChange={(e) => updateLine(l.id, 'rate', Number(e.target.value))} className="w-20 h-8 px-2 rounded border text-sm text-right outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" max="100" value={l.discountPercent} onChange={(e) => updateLine(l.id, 'discountPercent', Number(e.target.value))} className="w-14 h-8 px-2 rounded border text-sm text-right outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><select value={l.gstRate} onChange={(e) => updateLine(l.id, 'gstRate', Number(e.target.value))} className="w-16 h-8 px-1 rounded border text-sm outline-none" style={{ border: '1px solid var(--border)' }}>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</select></td>
                    <td className="py-2 pr-2 text-right text-sm font-medium" style={{ color: 'var(--text)' }}>{l.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="py-2"><button onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))} disabled={lines.length === 1} className="p-1 rounded hover:bg-err-50 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5 text-err-500" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-3">
            <button onClick={() => setLines((p) => [...p, emptyLine()])} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
              <Plus className="w-4 h-4" /> Add Line
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Per invoice:</span>
              <AmountDisplay amount={totals.grandTotal} className="font-bold" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          <Textarea label="Terms" value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} />
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> Create Template
          </button>
        </div>
      </div>
    </div>
  )
}
