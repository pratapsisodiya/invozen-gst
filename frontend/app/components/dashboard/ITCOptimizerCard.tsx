'use client'
import { useState } from 'react'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { Sparkles, Loader2, AlertTriangle, TrendingUp, Shield, Lightbulb, RotateCcw } from 'lucide-react'
import type { ITCRecommendation } from '@/app/api/ai/itc-optimize/route'

interface ITCResult {
  recommendations: ITCRecommendation[]
  totalClaimable: number
  totalAtRisk: number
}

const TYPE_CONFIG = {
  claim: { label: 'Claim', bg: '#ECFDF5', text: '#059669', Icon: TrendingUp },
  reverse: { label: 'Reverse', bg: '#FEF2F2', text: '#DC2626', Icon: RotateCcw },
  risk: { label: 'Risk', bg: '#FFF7ED', text: '#EA580C', Icon: AlertTriangle },
  opportunity: { label: 'Opportunity', bg: '#EEF2FF', text: '#4F46E5', Icon: Lightbulb },
}

const PRIORITY_DOT: Record<string, string> = { high: '#EF4444', medium: '#F59E0B', low: '#6B7280' }

export function ITCOptimizerCard() {
  const { purchases, getItcSummary } = usePurchaseStore()
  const [result, setResult] = useState<ITCResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    const itcSummary = getItcSummary()
    const now = new Date()
    const currentMonth = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const currentFY = `${fy}-${String(fy + 1).slice(2)}`

    const purchasesPayload = purchases.map((p) => ({
      vendorName: p.vendorSnapshot.name,
      vendorGstin: p.vendorSnapshot.gstin,
      invoiceDate: p.invoiceDate,
      taxableValue: p.taxableValue,
      igst: p.igstTotal,
      cgst: p.cgstTotal,
      sgst: p.sgstTotal,
      itcStatus: p.itcStatus,
    }))

    try {
      const res = await fetch('/api/ai/itc-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchases: purchasesPayload, itcSummary, currentMonth, currentFY }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as ITCResult
      setResult(data)
    } catch {
      setError('Could not run ITC analysis. Check AI configuration.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI ITC Optimizer</h3>
        </div>
        <div className="flex gap-2">
          {result && (
            <button onClick={() => void handleRun()}
              className="text-xs px-2 py-1 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              Re-run
            </button>
          )}
          {!result && !loading && (
            <button onClick={() => void handleRun()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> Run Analysis
            </button>
          )}
        </div>
      </div>

      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Shield className="w-8 h-8 text-indigo-100" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyze your ITC position and get claim recommendations</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyzing ITC…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-err-50 text-err-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ background: '#ECFDF5', border: '1px solid #86EFAC' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 mb-1">Total Claimable</p>
              <p className="text-lg font-bold tabular-nums text-green-700">₹{result.totalClaimable.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 mb-1">At Risk</p>
              <p className="text-lg font-bold tabular-nums text-orange-700">₹{result.totalAtRisk.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="flex flex-col gap-2">
            {result.recommendations.map((rec, i) => {
              const cfg = TYPE_CONFIG[rec.type]
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: cfg.bg, color: cfg.text }}>
                    {cfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{rec.title}</p>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PRIORITY_DOT[rec.priority] }} />
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{rec.description}</p>
                  </div>
                  {rec.estimatedAmount > 0 && (
                    <span className="text-xs font-bold tabular-nums flex-shrink-0" style={{ color: cfg.text }}>
                      ₹{rec.estimatedAmount.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              )
            })}
            {result.recommendations.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No recommendations — your ITC position looks clean.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
