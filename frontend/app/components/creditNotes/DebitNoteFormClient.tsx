'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useCreditNoteStore } from '@/lib/store/creditNoteStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useUIStore } from '@/lib/store/uiStore'
import { generateId } from '@/lib/utils/ids'
import { TopBar } from '../app/TopBar'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { AmountDisplay } from '../ui/AmountDisplay'
import { Plus, Trash2, Search, Save, CheckCircle } from 'lucide-react'
import { DEBIT_NOTE_REASON_LABELS } from '@/types/creditNote'
import type { DebitNoteReason, DebitNote } from '@/types/creditNote'
import type { PurchaseLineItem } from '@/types/purchase'

function emptyLine(): PurchaseLineItem {
  return { id: generateId(), description: '', hsnSac: '', quantity: 1, unit: 'NOS', rate: 0, discountPercent: 0, taxableValue: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 0, totalAmount: 0, itcEligible: true }
}

function calcLine(l: PurchaseLineItem, supplyType: 'intra' | 'inter'): PurchaseLineItem {
  const taxableValue = Math.round(l.quantity * l.rate * (1 - l.discountPercent / 100) * 100) / 100
  const gstAmt = Math.round(taxableValue * l.gstRate / 100 * 100) / 100
  return { ...l, taxableValue, cgst: supplyType === 'intra' ? gstAmt / 2 : 0, sgst: supplyType === 'intra' ? gstAmt / 2 : 0, igst: supplyType === 'inter' ? gstAmt : 0, totalAmount: Math.round((taxableValue + gstAmt) * 100) / 100 }
}

export function DebitNoteFormClient() {
  const router = useRouter()
  const { debitNotes, addDebitNote } = useCreditNoteStore()
  const { purchases, vendors } = usePurchaseStore()
  const { addToast } = useUIStore()

  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [showPurDrop, setShowPurDrop] = useState(false)
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('')
  const [reason, setReason] = useState<DebitNoteReason>('purchase_return')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<PurchaseLineItem[]>([emptyLine()])

  const purchaseResults = useMemo(() => {
    const pool = purchaseSearch
      ? purchases.filter((p) => p.purchaseNumber.toLowerCase().includes(purchaseSearch.toLowerCase()) || p.vendorSnapshot.name.toLowerCase().includes(purchaseSearch.toLowerCase()))
      : purchases.slice(0, 6)
    return pool.slice(0, 6)
  }, [purchases, purchaseSearch])

  const selectedPurchase = purchases.find((p) => p.id === selectedPurchaseId)
  const supplyType = selectedPurchase?.supplyType || 'intra'

  const selectPurchase = (id: string) => {
    const p = purchases.find((x) => x.id === id)
    if (!p) return
    setSelectedPurchaseId(id)
    setPurchaseSearch(`${p.purchaseNumber} — ${p.vendorSnapshot.name}`)
    setLines(p.lineItems.map((li) => ({ ...li, id: generateId() })))
    setShowPurDrop(false)
  }

  const updateLine = (lineId: string, field: keyof PurchaseLineItem, value: string | number) => {
    setLines((prev) => prev.map((l) => l.id === lineId ? calcLine({ ...l, [field]: value }, supplyType) : l))
  }

  const totals = useMemo(() => {
    const taxableValue = lines.reduce((s, l) => s + l.taxableValue, 0)
    const cgstTotal = lines.reduce((s, l) => s + l.cgst, 0)
    const sgstTotal = lines.reduce((s, l) => s + l.sgst, 0)
    const igstTotal = lines.reduce((s, l) => s + l.igst, 0)
    return { taxableValue, cgstTotal, sgstTotal, igstTotal, totalTax: cgstTotal + sgstTotal + igstTotal, grandTotal: Math.round(lines.reduce((s, l) => s + l.totalAmount, 0)) }
  }, [lines])

  const handleSave = async (approve: boolean) => {
    if (approve) {
      try {
        const res = await fetch('/api/ai/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineItems: lines, supplyType })
        })
        const result = await res.json()
        if (result.warnings?.length > 0) {
          const msg = result.warnings.slice(0, 2).map((w: string) => `• ${w}`).join('\n')
          addToast({ type: 'warning', title: 'Validation warnings', message: msg })
        }
      } catch (e) {
        console.error('Validation failed:', e)
      }
    }

    const dnNum = `DN-${new Date().getFullYear()}-${String(debitNotes.length + 1).padStart(3, '0')}`
    const vendorId = selectedPurchase?.vendorId || ''
    const vendor = vendors.find((v) => v.id === vendorId)
    const dn: DebitNote = {
      id: generateId(),
      debitNoteNumber: dnNum,
      status: approve ? 'approved' : 'draft',
      linkedPurchaseId: selectedPurchase?.id || null,
      linkedPurchaseNumber: selectedPurchase?.purchaseNumber || null,
      vendorId,
      vendorSnapshot: selectedPurchase ? selectedPurchase.vendorSnapshot : { name: 'Unknown', gstin: null, state: '' },
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
    addDebitNote(dn)
    addToast({ type: 'success', title: approve ? 'Debit note approved' : 'Debit note saved as draft' })
    router.push('/debit-notes')
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="New Debit Note" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Debit Notes', href: '/debit-notes' }]} />
      <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">

        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Debit Note Details</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-[13px] font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Linked Purchase</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input value={purchaseSearch} onChange={(e) => { setPurchaseSearch(e.target.value); setShowPurDrop(true) }} onFocus={() => setShowPurDrop(true)}
                  placeholder="Search purchases..." className="w-full h-10 rounded-lg border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                  style={{ border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              {showPurDrop && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowPurDrop(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl py-1 max-h-48 overflow-y-auto"
                    style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                    {purchaseResults.map((p) => (
                      <button key={p.id} onClick={() => selectPurchase(p.id)} className="flex flex-col w-full px-3 py-2 text-left hover:bg-ink-50 transition-colors">
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{p.purchaseNumber} — {p.vendorSnapshot.name}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.invoiceDate} · ₹{p.grandTotal.toLocaleString('en-IN')}</span>
                      </button>
                    ))}
                    {purchaseResults.length === 0 && <p className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>No purchases found</p>}
                  </div>
                </>
              )}
            </div>
            <Select
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as DebitNoteReason)}
              options={Object.entries(DEBIT_NOTE_REASON_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
          </div>
        </div>

        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Description', 'Qty', 'Rate', 'GST%', 'Taxable', 'Tax', 'Total', ''].map((h) => (
                    <th key={h} className="pb-2 text-left text-[11px] font-semibold uppercase pr-2" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-2"><input value={l.description} onChange={(e) => updateLine(l.id, 'description', e.target.value)} className="w-full min-w-[140px] h-8 px-2 rounded border text-sm outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={l.quantity} onChange={(e) => updateLine(l.id, 'quantity', Number(e.target.value))} className="w-16 h-8 px-2 rounded border text-sm text-right outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" value={l.rate} onChange={(e) => updateLine(l.id, 'rate', Number(e.target.value))} className="w-20 h-8 px-2 rounded border text-sm text-right outline-none focus:ring-1" style={{ border: '1px solid var(--border)' }} /></td>
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
