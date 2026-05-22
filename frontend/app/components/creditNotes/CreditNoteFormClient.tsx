'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useCreditNoteStore } from '@/lib/store/creditNoteStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useUIStore } from '@/lib/store/uiStore'
import { generateId } from '@/lib/utils/ids'
import { calculateLineItem } from '@/lib/gst/calculator'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { AmountDisplay } from '../ui/AmountDisplay'
import { Plus, Trash2, Search, Save, CheckCircle } from 'lucide-react'
import { CREDIT_NOTE_REASON_LABELS } from '@/types/creditNote'
import type { CreditNoteReason, CreditNote } from '@/types/creditNote'
import type { LineItem } from '@/types/invoice'

function emptyLine(supplyType: 'intra' | 'inter'): LineItem {
  return { id: generateId(), itemId: null, description: '', hsnSac: '', quantity: 1, unit: 'NOS', rate: 0, discountPercent: 0, taxableValue: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 0, cessRate: 0, cessAmount: 0, totalAmount: 0 }
}

export function CreditNoteFormClient() {
  const router = useRouter()
  const { creditNotes, addCreditNote } = useCreditNoteStore()
  const { invoices } = useInvoiceStore()
  const { addToast } = useUIStore()

  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [showInvDrop, setShowInvDrop] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [reason, setReason] = useState<CreditNoteReason>('sales_return')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([emptyLine('intra')])

  const eligibleInvoices = useMemo(() =>
    invoices.filter((i) => i.status === 'sent' || i.status === 'paid' || i.status === 'overdue'),
    [invoices]
  )

  const invoiceResults = useMemo(() => {
    const pool = invoiceSearch
      ? eligibleInvoices.filter((i) => i.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) || i.customerSnapshot.name.toLowerCase().includes(invoiceSearch.toLowerCase()))
      : eligibleInvoices.slice(0, 6)
    return pool.slice(0, 6)
  }, [eligibleInvoices, invoiceSearch])

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId)
  const supplyType = selectedInvoice?.supplyType || 'intra'

  const selectInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id)
    if (!inv) return
    setSelectedInvoiceId(id)
    setInvoiceSearch(`${inv.invoiceNumber} — ${inv.customerSnapshot.name}`)
    setLines(inv.lineItems.map((li) => ({ ...li, id: generateId() })))
    setShowInvDrop(false)
  }

  const updateLine = (lineId: string, field: keyof LineItem, value: string | number) => {
    setLines((prev) => prev.map((l) => {
      if (l.id !== lineId) return l
      const updated = { ...l, [field]: value }
      const calc = calculateLineItem(updated.quantity, updated.rate, updated.discountPercent, updated.gstRate, supplyType)
      return { ...updated, ...calc }
    }))
  }

  const totals = useMemo(() => ({
    taxableValue: lines.reduce((s, l) => s + l.taxableValue, 0),
    cgstTotal: lines.reduce((s, l) => s + l.cgst, 0),
    sgstTotal: lines.reduce((s, l) => s + l.sgst, 0),
    igstTotal: lines.reduce((s, l) => s + l.igst, 0),
    totalTax: lines.reduce((s, l) => s + l.cgst + l.sgst + l.igst, 0),
    grandTotal: Math.round(lines.reduce((s, l) => s + l.totalAmount, 0)),
  }), [lines])

  const handleSave = (approve: boolean) => {
    if (!selectedInvoice) { addToast({ type: 'error', title: 'Please select an invoice' }); return }
    const cnNum = `CN-${new Date().getFullYear()}-${String(creditNotes.length + 1).padStart(3, '0')}`
    const cn: CreditNote = {
      id: generateId(),
      creditNoteNumber: cnNum,
      status: approve ? 'approved' : 'draft',
      linkedInvoiceId: selectedInvoice.id,
      linkedInvoiceNumber: selectedInvoice.invoiceNumber,
      customerId: selectedInvoice.customerId,
      customerSnapshot: selectedInvoice.customerSnapshot,
      reason,
      lineItems: lines,
      subtotal: Math.round(lines.reduce((s, l) => s + l.quantity * l.rate, 0) * 100) / 100,
      taxableValue: Math.round(totals.taxableValue * 100) / 100,
      cgstTotal: Math.round(totals.cgstTotal * 100) / 100,
      sgstTotal: Math.round(totals.sgstTotal * 100) / 100,
      igstTotal: Math.round(totals.igstTotal * 100) / 100,
      totalTax: Math.round(totals.totalTax * 100) / 100,
      grandTotal: totals.grandTotal,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addCreditNote(cn)
    addToast({ type: 'success', title: approve ? 'Credit note approved' : 'Credit note saved as draft' })
    router.push('/credit-notes')
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="New Credit Note" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Credit Notes', href: '/credit-notes' }]} />
      <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">

        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Credit Note Details</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Linked Invoice <span className="text-red-500">*</span></label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input value={invoiceSearch} onChange={(e) => { setInvoiceSearch(e.target.value); setShowInvDrop(true) }} onFocus={() => setShowInvDrop(true)}
                  placeholder="Search invoices..." className="w-full h-10 rounded-lg border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                  style={{ border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              {showInvDrop && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowInvDrop(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl py-1 max-h-48 overflow-y-auto"
                    style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                    {invoiceResults.map((inv) => (
                      <button key={inv.id} onClick={() => selectInvoice(inv.id)}
                        className="flex flex-col w-full px-3 py-2 text-left hover:bg-ink-50 transition-colors">
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{inv.invoiceNumber} — {inv.customerSnapshot.name}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{inv.invoiceDate} · ₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                      </button>
                    ))}
                    {invoiceResults.length === 0 && <p className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>No invoices found</p>}
                  </div>
                </>
              )}
            </div>
            <Select
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as CreditNoteReason)}
              options={Object.entries(CREDIT_NOTE_REASON_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
          </div>
          {selectedInvoice && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Customer: <span style={{ color: 'var(--text)' }}>{selectedInvoice.customerSnapshot.name}</span> · State: {selectedInvoice.customerSnapshot.state} · Supply: {selectedInvoice.supplyType}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Description', 'Qty', 'Rate', 'Disc%', 'GST%', 'Taxable', 'Tax', 'Total', ''].map((h) => (
                    <th key={h} className="pb-2 text-left text-[11px] font-semibold uppercase pr-2" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-2"><input value={l.description} onChange={(e) => updateLine(l.id, 'description', e.target.value)} className="w-full min-w-[140px] h-8 px-2 rounded border text-sm outline-none focus:ring-1 focus:ring-brand-600/20" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={l.quantity} onChange={(e) => updateLine(l.id, 'quantity', Number(e.target.value))} className="w-16 h-8 px-2 rounded border text-sm text-right outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
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
          <button onClick={() => setLines((p) => [...p, emptyLine(supplyType)])} className="mt-3 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <Plus className="w-4 h-4" /> Add Line
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            {[
              { label: 'Taxable Value', value: totals.taxableValue },
              supplyType === 'intra' ? { label: 'CGST', value: totals.cgstTotal } : null,
              supplyType === 'intra' ? { label: 'SGST', value: totals.sgstTotal } : null,
              supplyType === 'inter' ? { label: 'IGST', value: totals.igstTotal } : null,
              { label: 'Grand Total', value: totals.grandTotal, bold: true },
            ].filter((x): x is NonNullable<typeof x> => x !== null).map(({ label, value, bold }) => (
              <div key={label} className={`flex justify-between py-1.5 ${bold ? 'border-t mt-1 pt-2.5 font-semibold' : ''}`} style={bold ? { borderColor: 'var(--border)' } : {}}>
                <span className="text-sm" style={{ color: bold ? 'var(--text)' : 'var(--text-2)' }}>{label}</span>
                <AmountDisplay amount={value ?? 0} className={`text-sm ${bold ? 'font-bold' : ''}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          <button onClick={() => handleSave(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-ink-100 hover:bg-ink-200 transition-colors" style={{ color: 'var(--text)' }}>
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => handleSave(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <CheckCircle className="w-4 h-4" /> Approve
          </button>
        </div>
      </div>
    </div>
  )
}
