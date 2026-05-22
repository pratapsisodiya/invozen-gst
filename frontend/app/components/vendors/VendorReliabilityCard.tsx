'use client'
import { useMemo, useState } from 'react'
import { ShieldAlert, ShieldCheck, ShieldOff, RefreshCw, Loader2 } from 'lucide-react'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { computeVendorReliabilityScores } from '@/lib/gst/vendorReliability'
import type { Vendor } from '@/types/purchase'
import { formatCurrencyWithSymbol } from '@/lib/utils/formatters'
import type { VendorReliabilityScore } from '@/lib/gst/vendorReliability'

interface Props {
  vendors: Vendor[]
}

type AIRecommendation = { vendorName: string; risk: string; suggestion: string; itcAmount: number }
type AIResult = { recommendations: AIRecommendation[]; summary: string }

const tierConfig = {
  reliable: { label: 'Reliable', color: 'var(--ok-600)', bg: 'var(--ok-50)', icon: ShieldCheck },
  caution: { label: 'Caution', color: 'var(--warn-700)', bg: 'var(--warn-50)', icon: ShieldAlert },
  risky: { label: 'Risky', color: 'var(--err-600)', bg: 'var(--err-50)', icon: ShieldAlert },
  unregistered: { label: 'Unregistered', color: 'var(--text-muted)', bg: 'var(--surface)', icon: ShieldOff },
}

export function VendorReliabilityCard({ vendors }: Props) {
  const { purchases } = usePurchaseStore()
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const scores = useMemo(
    () => computeVendorReliabilityScores(vendors, purchases),
    [vendors, purchases]
  )

  const totalITCAtRisk = scores.reduce((s, v) => s + v.pendingITCAtRisk, 0)
  const riskyCount = scores.filter((s) => s.reliabilityTier === 'risky').length

  const handleAIRecommend = async () => {
    if (aiLoading || scores.length === 0) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/vendor-reliability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendors: scores.slice(0, 20), totalITCAtRisk }),
      })
      if (res.ok) {
        const data = await res.json() as AIResult
        setAiResult(data)
      }
    } catch {
      // silently fail
    } finally {
      setAiLoading(false)
    }
  }

  if (scores.length === 0) return null

  return (
    <div
      className="rounded-xl bg-white p-4 flex flex-col gap-3 mb-4"
      style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Vendor GSTR-1 Filing Reliability
          </h3>
          {riskyCount > 0 && (
            <p className="text-[12px]" style={{ color: 'var(--err-600)' }}>
              {riskyCount} risky vendor{riskyCount > 1 ? 's' : ''} · ₹{totalITCAtRisk.toLocaleString('en-IN')} ITC at risk
            </p>
          )}
        </div>
        <button
          onClick={handleAIRecommend}
          disabled={aiLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-ink-50 transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          AI Recommendations
        </button>
      </div>

      {/* Scores table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Vendor', 'GSTIN', 'Purchases', 'Claimed', 'Reversed', 'Score', 'ITC at Risk'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => {
              const cfg = tierConfig[s.reliabilityTier]
              const Icon = cfg.icon
              return (
                <tr key={s.vendorId} className="border-t hover:bg-ink-50/50" style={{ borderColor: 'var(--border-soft)' }}>
                  <td className="px-3 py-2.5 font-medium text-[13px]" style={{ color: 'var(--text)' }}>{s.vendorName}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{s.gstin ?? '—'}</td>
                  <td className="px-3 py-2.5 text-[13px] text-center" style={{ color: 'var(--text)' }}>{s.totalPurchases}</td>
                  <td className="px-3 py-2.5 text-[13px] text-center text-ok-600">{s.claimedCount}</td>
                  <td className="px-3 py-2.5 text-[13px] text-center" style={{ color: s.reversedCount > 0 ? 'var(--err-600)' : 'var(--text-muted)' }}>{s.reversedCount}</td>
                  <td className="px-3 py-2.5">
                    <ScoreBar score={s.filingScore} tier={s.reliabilityTier} />
                  </td>
                  <td className="px-3 py-2.5 text-[13px] tabular-nums text-right" style={{ color: s.pendingITCAtRisk > 0 ? 'var(--err-600)' : 'var(--text-muted)' }}>
                    {s.pendingITCAtRisk > 0 ? formatCurrencyWithSymbol(s.pendingITCAtRisk) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* AI recommendations */}
      {aiResult && (
        <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>AI Analysis</p>
          <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>{aiResult.summary}</p>
          {aiResult.recommendations.map((r, i) => (
            <div key={i} className="text-[12px] flex gap-2 items-start">
              <span className="font-medium shrink-0" style={{ color: 'var(--text)' }}>{r.vendorName}:</span>
              <span style={{ color: 'var(--text-2)' }}>{r.suggestion}</span>
              {r.itcAmount > 0 && (
                <span className="ml-auto shrink-0 tabular-nums" style={{ color: 'var(--err-600)' }}>
                  {formatCurrencyWithSymbol(r.itcAmount)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScoreBar({ score, tier }: { score: number; tier: VendorReliabilityScore['reliabilityTier'] }) {
  const cfg = tierConfig[tier]
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--surface)', minWidth: 60 }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${score}%`, background: cfg.color }}
        />
      </div>
      <span
        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {tier === 'unregistered' ? 'Unreg.' : `${score}%`}
      </span>
    </div>
  )
}
