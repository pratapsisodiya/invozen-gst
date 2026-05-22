'use client'
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Sparkles, Loader2, Check, AlertTriangle, Copy } from 'lucide-react'
import type { ParsedCustomer } from '@/app/api/ai/parse-customer/route'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (data: ParsedCustomer) => void
}

const EXAMPLES = [
  'Ravi Sharma, ABC Traders, Mumbai Maharashtra, GSTIN 27ABCDE1234F1Z5, phone 9876543210',
  'Priya Consultants from Bangalore, priya@example.com, GSTIN 29AABCP1234C1Z3',
  'Fresh Mart store Pune, no GST, cash customer, +91-98765-43210',
]

export function AICustomerParserModal({ open, onClose, onApply }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParsedCustomer | null>(null)
  const [error, setError] = useState('')

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/ai/parse-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as ParsedCustomer
      setResult(data)
    } catch {
      setError('Could not parse. Try with more details like name, city, GSTIN, or phone.')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (result) {
      onApply(result)
      onClose()
      setText('')
      setResult(null)
    }
  }

  const confidenceColor = result?.confidence === 'high' ? 'text-green-600 bg-green-50' : result?.confidence === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50'

  return (
    <Modal open={open} onClose={() => { onClose(); setText(''); setResult(null) }} title="AI Customer Parser" size="sm">
      <div className="p-5 flex flex-col gap-4">
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Type or paste customer details in any format — AI will extract name, GSTIN, address, phone, and more.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="e.g. Ravi Sharma, ABC Exports Mumbai, GSTIN 27ABCDE1234F1Z5, 9876543210"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setText(ex)}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full hover:bg-brand-50 transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <Copy className="w-2.5 h-2.5" /> Example {i + 1}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Check className="w-4 h-4 text-brand-600" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Extracted Details</p>
              <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-semibold ${confidenceColor}`}>
                {result.confidence} confidence
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {[
                { label: 'Name', value: result.name },
                { label: 'Business', value: result.businessName },
                { label: 'GSTIN', value: result.gstin || '—' },
                { label: 'Type', value: result.customerType.toUpperCase() },
                { label: 'Phone', value: result.phone || '—' },
                { label: 'Email', value: result.email || '—' },
                { label: 'City', value: result.city || '—' },
                { label: 'State', value: result.state || '—' },
                { label: 'Pincode', value: result.pincode || '—' },
                { label: 'Address', value: result.addressLine1 || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                  <span className="font-medium" style={{ color: value === '—' ? 'var(--text-faint)' : 'var(--text)' }}>{value}</span>
                </div>
              ))}
            </div>
            {result.extracted.length > 0 && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
                Extracted: {result.extracted.join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => { onClose(); setText(''); setResult(null) }}
            className="flex-1 h-9 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
          {!result ? (
            <button onClick={handleParse} disabled={loading || !text.trim()}
              className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Parsing...</> : <><Sparkles className="w-3.5 h-3.5" />Parse</>}
            </button>
          ) : (
            <button onClick={handleApply}
              className="flex-1 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
              <Check className="w-3.5 h-3.5" /> Fill Form
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
