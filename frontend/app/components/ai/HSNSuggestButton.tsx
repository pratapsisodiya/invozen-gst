'use client'
import { useState } from 'react'
import { Wand2, X } from 'lucide-react'

interface HSNSuggestButtonProps {
  description: string
  itemType: 'product' | 'service'
  onApply: (hsnCode: string, gstRate: number) => void
}

interface HsnResult {
  hsnCode: string
  gstRate: number
  reasoning: string
}

export function HSNSuggestButton({ description, itemType, onApply }: HSNSuggestButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HsnResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!description.trim()) return null

  const handleClick = async () => {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/ai/hsn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, itemType }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as HsnResult
      setResult(data)
    } catch {
      setError('Could not suggest code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title="Suggest HSN/SAC code with AI"
        className="p-1 rounded hover:bg-brand-50 transition-colors disabled:opacity-50"
      >
        <Wand2 className={`w-3.5 h-3.5 ${loading ? 'animate-pulse text-brand-400' : 'text-brand-500'}`} />
      </button>

      {(result || error) && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setResult(null); setError(null) }} />
          <div className="absolute left-0 top-full mt-1 z-40 w-56 rounded-xl p-3"
            style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>AI Suggestion</p>
              <button onClick={() => { setResult(null); setError(null) }} className="p-0.5 rounded hover:bg-ink-100">
                <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            {error && <p className="text-xs text-err-600">{error}</p>}
            {result && (
              <>
                <div className="mb-2">
                  <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text)' }}>{result.hsnCode}</p>
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>GST: {result.gstRate}%</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{result.reasoning}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { onApply(result.hsnCode, result.gstRate); setResult(null) }}
                  className="w-full py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors"
                >
                  Apply
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
