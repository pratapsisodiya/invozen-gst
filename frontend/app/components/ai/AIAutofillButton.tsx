'use client'
import { useState } from 'react'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import { generateId } from '@/lib/utils/ids'
import { calculateLineItem } from '@/lib/gst/calculator'
import type { LineItem, SupplyType } from '@/types/invoice'
import type { Customer } from '@/types/customer'
import type { Invoice } from '@/types/invoice'
import type { Item } from '@/types/item'

interface SuggestedLine {
  itemId: string | null
  description: string
  hsnSac: string
  quantity: number
  unit: string
  rate: number
  gstRate: number
  reason: string
}

interface Props {
  customer: Customer
  pastInvoices: Invoice[]
  items: Item[]
  supplyType: SupplyType
  onApply: (lines: LineItem[]) => void
}

export function AIAutofillButton({ customer, pastInvoices, items, supplyType, onApply }: Props) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedLine[] | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const handleFetch = async () => {
    setLoading(true)
    setSuggestions(null)

    // Build history from past invoices (last 5, flatten line items, deduplicate by description)
    const recentMap = new Map<string, SuggestedLine>()
    for (const inv of pastInvoices.slice(0, 5)) {
      for (const li of inv.lineItems) {
        if (!recentMap.has(li.description)) {
          recentMap.set(li.description, {
            itemId: li.itemId,
            description: li.description,
            hsnSac: li.hsnSac,
            quantity: li.quantity,
            unit: li.unit,
            rate: li.rate,
            gstRate: li.gstRate,
            reason: '',
          })
        }
      }
    }

    try {
      const res = await fetch('/api/ai/autofill-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.businessName || customer.name,
          customerGstin: customer.gstin || null,
          recentLineItems: Array.from(recentMap.values()),
          availableItems: items.map((it) => ({
            id: it.id,
            name: it.name,
            hsnSac: it.hsnCode || it.sacCode || '',
            rate: it.defaultRate,
            gstRate: it.defaultGstRate,
            unit: it.unit,
          })),
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as { items: SuggestedLine[] }
      const sugg = data.items || []
      setSuggestions(sugg)
      setSelected(new Set(sugg.map((_, i) => i)))
      setShowPreview(true)
    } catch {
      // Silently fail — user can proceed manually
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!suggestions) return
    const lines: LineItem[] = suggestions
      .filter((_, i) => selected.has(i))
      .map((s) => {
        const calc = calculateLineItem(s.quantity, s.rate, 0, s.gstRate, supplyType)
        return {
          id: generateId(),
          itemId: s.itemId,
          description: s.description,
          hsnSac: s.hsnSac,
          quantity: s.quantity,
          unit: s.unit,
          rate: s.rate,
          discountPercent: 0,
          gstRate: s.gstRate,
          ...calc,
        }
      })
    onApply(lines)
    setShowPreview(false)
    setSuggestions(null)
  }

  if (showPreview && suggestions) {
    return (
      <div className="rounded-xl p-3 mb-3" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-200)' }}>
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <p className="text-sm font-semibold text-brand-700">AI Suggestions — based on {customer.businessName || customer.name}&apos;s history</p>
          <button onClick={() => setShowPreview(false)} className="ml-auto p-0.5 hover:bg-brand-100 rounded">
            <X className="w-3.5 h-3.5 text-brand-500" />
          </button>
        </div>
        <div className="flex flex-col gap-1.5 mb-3">
          {suggestions.map((s, i) => (
            <div key={i} onClick={() => setSelected((prev) => {
              const next = new Set(prev)
              if (next.has(i)) next.delete(i); else next.add(i)
              return next
            })}
              className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${selected.has(i) ? 'bg-white ring-1 ring-brand-400' : 'bg-brand-50/50 opacity-60'}`}>
              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${selected.has(i) ? 'bg-brand-600' : 'border border-gray-300 bg-white'}`}>
                {selected.has(i) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>{s.description}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {s.quantity} {s.unit} × ₹{s.rate.toLocaleString('en-IN')} · {s.gstRate}% GST
                  {s.reason && ` · ${s.reason}`}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(false)} className="flex-1 h-8 rounded-lg text-xs font-medium"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>Skip</button>
          <button onClick={handleApply} disabled={selected.size === 0}
            className="flex-1 h-8 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold disabled:opacity-50">
            Apply {selected.size} item{selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleFetch}
      disabled={loading || pastInvoices.length === 0}
      className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40 transition-colors"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      {loading ? 'Thinking...' : 'AI Autofill'}
    </button>
  )
}
