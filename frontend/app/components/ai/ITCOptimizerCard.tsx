'use client'
import { useState } from 'react'
import { Sparkles, Loader2, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import type { ITCRecommendation } from '@/app/api/ai/itc-optimize/route'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useBusinessStore } from '@/lib/store/businessStore'

interface Props {
  period: string
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; icon: typeof TrendingUp }> = {
  high: { bg: 'bg-err-50', text: 'text-err-700', icon: AlertTriangle },
  medium: { bg: 'bg-warn-50', text: 'text-warn-700', icon: Info },
  low: { bg: 'bg-brand-50', text: 'text-brand-700', icon: CheckCircle },
}

const TYPE_LABELS: Record<string, string> = {
  unclaimed: 'Unclaimed ITC',
  reversal: 'Should Reverse',
  expiry_risk: 'Expiry Risk',
  optimization: 'Optimization',
}

export function ITCOptimizerCard({ period }: Props) {
  const { purchases } = usePurchaseStore()
  const { profile } = useBusinessStore()
  const [loading, setLoading] = useState(false)
  const [recs, setRecs] = useState<ITCRecommendation[] | null>(null)
  const [totalSavings, setTotalSavings] = useState(0)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    setRecs(null)
    try {
      const res = await fetch('/api/ai/itc-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          businessState: profile.state || 'Karnataka',
          purchases: purchases.slice(0, 50).map((p) => ({
            id: p.id,
            vendorName: p.vendorSnapshot.name,
            vendorGstin: p.vendorSnapshot.gstin,
            category: 'purchases',
            amount: p.grandTotal,
            gstAmount: p.totalTax,
            gstRate: p.totalTax > 0 && p.taxableValue > 0 ? Math.round((p.totalTax / p.taxableValue) * 100) : 18,
            itcEligible: p.itcStatus === 'eligible' || p.itcStatus === 'claimed',
            paymentStatus: p.status === 'claimed' ? 'paid' : 'pending',
            invoiceDate: p.invoiceDate,
            hsnCode: p.lineItems[0]?.hsnSac ?? '',
          })),
        }),
      })
      if (!res.ok) throw new Error('AI unavailable')
      const data = await res.json() as { recommendations: ITCRecommendation[]; totalPotentialITC: number; totalRiskAmount: number }
      setRecs(data.recommendations)
      setTotalSavings(data.totalPotentialITC)
    } catch {
      setError('Could not analyze ITC. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI ITC Optimizer</span>
          {totalSavings > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-semibold">
              ₹{totalSavings.toLocaleString('en-IN')} potential
            </span>
          )}
        </div>
        {!loading && (
          <button onClick={handleAnalyze}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors">
            <Sparkles className="w-3 h-3" /> {recs ? 'Re-analyze' : 'Analyze ITC'}
          </button>
        )}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
      </div>

      {!recs && !loading && !error && (
        <div className="px-4 py-6 text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-brand-200" />
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Optimize your ITC claims</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            AI will scan your purchases, find unclaimed ITC, blocked categories, and expiry risks.
          </p>
        </div>
      )}

      {error && (
        <div className="px-4 py-3">
          <p className="text-xs text-err-600 bg-err-50 px-3 py-2 rounded-lg">{error}</p>
        </div>
      )}

      {loading && (
        <div className="px-4 py-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyzing ITC eligibility…</p>
        </div>
      )}

      {recs && recs.length === 0 && (
        <div className="px-4 py-6 text-center">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-brand-400" />
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>ITC looks good!</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No major issues or optimizations found for this period.</p>
        </div>
      )}

      {recs && recs.length > 0 && (
        <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border-soft)' }}>
          {recs.map((rec, i) => {
            const style = PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES.low
            const Icon = style.icon
            return (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${style.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
                      style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {TYPE_LABELS[rec.type] ?? rec.type}
                    </span>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{rec.title}</p>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{rec.description}</p>
                  {rec.estimatedAmount > 0 && (
                    <p className="text-xs font-semibold mt-1 text-brand-700">
                      ₹{rec.estimatedAmount.toLocaleString('en-IN')} at stake
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
