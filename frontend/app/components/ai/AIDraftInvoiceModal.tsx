'use client'
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useItemStore } from '@/lib/store/itemStore'
import { Sparkles, Loader2, ArrowRight } from 'lucide-react'
import type { DraftedInvoice } from '@/app/api/ai/draft-invoice/route'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (draft: DraftedInvoice) => void
}

const EXAMPLES = [
  'Bill Ravi Sharma 2 laptops at 55000 each with 18% GST',
  'Invoice Meera Electronics for 5 LED panels ₹8000 each',
  'Charge ABC Ltd for 10 hours consulting at 5000/hr',
  'Create invoice for Sharma Traders: 50kg steel rods at 120/kg',
]

export function AIDraftInvoiceModal({ open, onClose, onApply }: Props) {
  const { customers } = useCustomerStore()
  const { items } = useItemStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<DraftedInvoice | null>(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setDraft(null)
    try {
      const res = await fetch('/api/ai/draft-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: input,
          availableCustomers: customers.slice(0, 20).map((c) => ({
            id: c.id, name: c.name, gstin: c.gstin, state: c.billingAddress.state,
          })),
          availableItems: items.slice(0, 30).map((i) => ({
            id: i.id, name: i.name, hsnCode: i.hsnCode, defaultRate: i.defaultRate, defaultGstRate: i.defaultGstRate,
          })),
        }),
      })
      if (!res.ok) throw new Error('AI unavailable')
      const data = await res.json() as DraftedInvoice
      setDraft(data)
    } catch {
      setError('AI could not draft the invoice. Please try again or create manually.')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!draft) return
    onApply(draft)
    onClose()
    setInput('')
    setDraft(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="AI Invoice Drafter" size="md">
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Sparkles className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Describe your invoice in plain English. AI will extract customer, items, quantities, rates and GST.
          </p>
        </div>

        <div>
          <label className="text-[13px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Describe the invoice</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate() }}
            placeholder="e.g. Bill Ravi Sharma 2 laptops at 55000 each with 18% GST"
            rows={3}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 resize-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setInput(ex)}
                className="text-[11px] px-2 py-0.5 rounded-full hover:bg-brand-100 transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                {ex.substring(0, 35)}…
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-err-600 bg-err-50 px-3 py-2 rounded-lg">{error}</p>}

        {draft && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Draft Preview</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {draft.customerHint && (
                <div className="text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>Customer hint: </span>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{draft.customerHint}</span>
                </div>
              )}
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Description', 'Qty', 'Rate', 'GST%', 'HSN'].map((h) => (
                      <th key={h} className="text-left pb-1.5 font-semibold pr-3" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draft.lineItems.map((li, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'var(--border-soft)' }}>
                      <td className="py-1.5 pr-3 font-medium" style={{ color: 'var(--text)' }}>{li.description}</td>
                      <td className="py-1.5 pr-3 tabular-nums" style={{ color: 'var(--text)' }}>{li.quantity}</td>
                      <td className="py-1.5 pr-3 tabular-nums" style={{ color: 'var(--text)' }}>₹{li.rate.toLocaleString('en-IN')}</td>
                      <td className="py-1.5 pr-3" style={{ color: 'var(--text-muted)' }}>{li.gstRate}%</td>
                      <td className="py-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>{li.hsnSac || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {draft.notes && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Notes: {draft.notes}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 px-5 pb-5">
        <button onClick={onClose} className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
          Cancel
        </button>
        {!draft ? (
          <button onClick={handleGenerate} disabled={loading || !input.trim()}
            className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Draft</>}
          </button>
        ) : (
          <button onClick={handleApply}
            className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4" /> Apply to Form
          </button>
        )}
      </div>
    </Modal>
  )
}
