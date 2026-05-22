'use client'
import { useState } from 'react'
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import type { GSTR1Summary, GSTR3BSummary } from '@/types/gst'

interface ReconciliationGap {
  description: string
  gstr1Amount: number
  gstr3bAmount: number
  difference: number
}

interface AssistResult {
  reconciliationGaps: ReconciliationGap[]
  suggestions: string[]
}

interface Props {
  gstr1Summaries: GSTR1Summary[]
  gstr3bSummaries: GSTR3BSummary[]
  financialYear: string
}

export function GSTR9AssistantClient({ gstr1Summaries, gstr3bSummaries, financialYear }: Props) {
  const [result, setResult] = useState<AssistResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/gstr9-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstr1Summaries, gstr3bSummaries, financialYear }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json() as AssistResult
      setResult(data)
      setExpanded(true)
    } catch {
      setError('Could not run AI analysis. Check AI configuration.')
    } finally {
      setLoading(false)
    }
  }

  const hasGaps = result && result.reconciliationGaps.some((g) => Math.abs(g.difference) >= 1)

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-ink-50/50 transition-colors"
        style={{ borderBottom: expanded ? '1px solid var(--border)' : undefined }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI GSTR-9 Reconciliation Assistant</span>
          {result && !hasGaps && <span className="text-[11px] px-2 py-0.5 rounded-full bg-ok-50 text-ok-700 font-medium">Clean</span>}
          {result && hasGaps && <span className="text-[11px] px-2 py-0.5 rounded-full bg-warn-50 text-warn-700 font-medium">{result.reconciliationGaps.length} gap{result.reconciliationGaps.length !== 1 ? 's' : ''}</span>}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
      </button>

      {expanded && (
        <div className="p-5 flex flex-col gap-4">
          {!result && !loading && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                Run AI analysis to identify reconciliation gaps between GSTR-1 and GSTR-3B for FY {financialYear}.
              </p>
              <button
                onClick={() => void handleAnalyze()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Run AI Analysis
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Analysing GSTR-1 vs GSTR-3B…</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-err-50 text-err-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <>
              {/* Reconciliation gaps table */}
              {result.reconciliationGaps.length > 0 ? (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                        {['Description', 'GSTR-1', 'GSTR-3B', 'Difference'].map((h) => (
                          <th key={h} className={`px-3 py-2 text-[11px] font-semibold uppercase ${h === 'Description' ? 'text-left' : 'text-right'}`} style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.reconciliationGaps.map((gap, i) => {
                        const diff = gap.difference
                        const diffColor = Math.abs(diff) < 1 ? 'text-ok-600' : diff > 0 ? 'text-warn-600' : 'text-err-600'
                        return (
                          <tr key={i} className="border-t h-9" style={{ borderColor: 'var(--border-soft)' }}>
                            <td className="px-3 py-1.5" style={{ color: 'var(--text)' }}>{gap.description}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: 'var(--text)' }}>₹{gap.gstr1Amount.toLocaleString('en-IN')}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: 'var(--text)' }}>₹{gap.gstr3bAmount.toLocaleString('en-IN')}</td>
                            <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${diffColor}`}>
                              {Math.abs(diff) < 1 ? '—' : `${diff > 0 ? '+' : ''}₹${diff.toLocaleString('en-IN')}`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-ok-50 text-ok-700 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Reconciliation looks clean — no significant gaps found.
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Filing Suggestions</p>
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-600 flex-shrink-0 mt-1.5" />
                      {s}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => void handleAnalyze()}
                className="self-start text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Re-run analysis
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
