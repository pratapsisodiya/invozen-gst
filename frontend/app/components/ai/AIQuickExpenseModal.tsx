'use client'
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useExpenseStore } from '@/lib/store/expenseStore'
import { useUIStore } from '@/lib/store/uiStore'
import { generateId } from '@/lib/utils/ids'
import type { Expense, ExpenseCategory } from '@/types/expense'
import { EXPENSE_CATEGORY_LABELS } from '@/types/expense'
import type { ParsedExpense } from '@/app/api/ai/quick-expense/route'
import { Sparkles, Loader2, Check, AlertTriangle, Zap } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

const EXAMPLES = [
  'Paid ₹5000 for office rent to GSTIN 27ABCDE1234F1Z5 via UPI',
  'Fuel 3000 rupees petty cash',
  'Professional fees 15000 to CA firm, TDS applicable',
  'Team lunch 2500 swiggy',
]

export function AIQuickExpenseModal({ open, onClose }: Props) {
  const { addExpense } = useExpenseStore()
  const { addToast } = useUIStore()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedExpense | null>(null)
  const [error, setError] = useState('')

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setParsed(null)
    try {
      const res = await fetch('/api/ai/quick-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as ParsedExpense
      setParsed(data)
    } catch {
      setError('Could not parse. Try including amount and description.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!parsed || !parsed.amount) { addToast({ type: 'error', title: 'Amount is required' }); return }
    const validCats = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]
    const category = validCats.includes(parsed.category as ExpenseCategory) ? parsed.category as ExpenseCategory : 'other'
    const gstRate = parsed.isGstRegistered ? parsed.gstRate : 0
    const gstAmount = Math.round(parsed.amount * (gstRate / 100) * 100) / 100

    const expense: Expense = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      category,
      description: parsed.description,
      vendorName: parsed.vendorName || null,
      vendorGstin: null,
      amount: parsed.amount,
      gstRate,
      gstAmount,
      totalAmount: parsed.amount,
      isGstRegistered: parsed.isGstRegistered,
      isItcEligible: parsed.isItcEligible,
      supplyType: 'intra',
      paymentMethod: parsed.paymentMethod,
      reference: null,
      receiptRef: null,
      notes: parsed.notes || null,
      createdAt: new Date().toISOString(),
    }
    addExpense(expense)
    addToast({ type: 'success', title: 'Expense saved', message: `₹${parsed.amount.toLocaleString('en-IN')} — ${parsed.description}` })
    onClose()
    setText('')
    setParsed(null)
  }

  const confidenceColor = parsed?.confidence === 'high' ? 'text-green-600 bg-green-50' : parsed?.confidence === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50'

  return (
    <Modal open={open} onClose={() => { onClose(); setText(''); setParsed(null) }} title="AI Quick Expense" size="sm">
      <div className="p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-brand-600" />
            <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>Describe the expense in plain language</p>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleParse() }}
            rows={2}
            placeholder="e.g. Paid 5000 for office rent via UPI..."
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setText(ex)}
                className="text-[11px] px-2 py-1 rounded-full hover:bg-brand-50 transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                {ex.substring(0, 30)}…
              </button>
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-faint)' }}>Tip: Ctrl+Enter to parse</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
          </div>
        )}

        {parsed && (
          <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Check className="w-4 h-4 text-brand-600" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Parsed Expense</p>
              <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-semibold ${confidenceColor}`}>
                {parsed.confidence}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {[
                { label: 'Description', value: parsed.description },
                { label: 'Amount', value: `₹${parsed.amount.toLocaleString('en-IN')}` },
                { label: 'Category', value: EXPENSE_CATEGORY_LABELS[parsed.category as ExpenseCategory] || parsed.category },
                { label: 'Vendor', value: parsed.vendorName || '—' },
                { label: 'GST Rate', value: parsed.isGstRegistered ? `${parsed.gstRate}%` : 'N/A' },
                { label: 'ITC Eligible', value: parsed.isItcEligible ? 'Yes' : 'No' },
                { label: 'Payment', value: parsed.paymentMethod },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{value}</span>
                </div>
              ))}
            </div>
            {parsed.reasoning && (
              <p className="text-[11px] mt-2 italic" style={{ color: 'var(--text-faint)' }}>{parsed.reasoning}</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => { onClose(); setText(''); setParsed(null) }}
            className="flex-1 h-9 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
          {!parsed ? (
            <button onClick={handleParse} disabled={loading || !text.trim()}
              className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Parsing...</> : <><Sparkles className="w-3.5 h-3.5" />Parse</>}
            </button>
          ) : (
            <button onClick={handleSave}
              className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
              <Check className="w-3.5 h-3.5" /> Save Expense
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
