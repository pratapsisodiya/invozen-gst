'use client'
import { useState, useEffect } from 'react'
import { Wand2 } from 'lucide-react'
import { useBusinessStore } from '@/lib/store/businessStore'
import type { GSTR1Summary, GSTR3BSummary } from '@/types/gst'

interface ReportInsightsProps {
  gstr1: GSTR1Summary
  gstr3b: GSTR3BSummary
  period: { month: number; year: number; label: string }
}

export function ReportInsights({ gstr1, gstr3b, period }: ReportInsightsProps) {
  const { profile } = useBusinessStore()
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    setInsights([])
    setFetched(false)
    setError(null)
  }, [period.month, period.year])

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          gstr1: {
            b2bCount: gstr1.b2b.length,
            b2bTaxable: gstr1.b2b.reduce((s, e) => s + e.taxableValue, 0),
            b2csTaxable: gstr1.b2cs.reduce((s, e) => s + e.taxableValue, 0),
            totalTaxable: gstr1.totals.taxableValue,
            totalTax: gstr1.totals.totalTax,
            hsnCount: gstr1.hsn.length,
            topHsn: gstr1.hsn.slice(0, 3).map((h) => ({ hsn: h.hsnCode, taxable: h.taxableValue })),
          },
          gstr3b: {
            interStateTaxable: gstr3b.section31.outwardTaxableInterState.taxableValue,
            intraStateTaxable: gstr3b.section31.outwardTaxableIntraState.taxableValue,
            totalOutput: gstr3b.taxLiability.totalOutput,
            netItc: gstr3b.itcAvailable.netItc,
            netPayable: gstr3b.taxLiability.netPayableTotal,
          },
          business: {
            name: profile.businessName,
            gstin: profile.gstin,
            filingFrequency: profile.filingFrequency,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to fetch insights')
      const data = await res.json() as { insights: string[] }
      setInsights(data.insights ?? [])
      setFetched(true)
    } catch {
      setError('Could not generate insights. Please check your AI configuration.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Insights</h3>
          <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-brand-50 text-brand-600">
            {period.label}
          </span>
        </div>
        {!fetched ? (
          <button
            onClick={handleFetch}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Analyzing…' : 'Generate Insights'}
          </button>
        ) : (
          <button onClick={handleFetch} disabled={loading} className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      {loading && (
        <div className="px-5 py-8 text-center">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyzing your GST data…</p>
        </div>
      )}

      {error && !loading && (
        <div className="px-5 py-4 text-sm text-err-600">{error}</div>
      )}

      {insights.length > 0 && !loading && (
        <ul className="px-5 py-4 flex flex-col gap-2.5">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
              <span className="text-brand-600 font-bold mt-0.5 flex-shrink-0">•</span>
              {insight}
            </li>
          ))}
        </ul>
      )}

      {!fetched && !loading && (
        <div className="px-5 py-8 text-center">
          <Wand2 className="w-8 h-8 text-brand-200 mx-auto mb-2" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Click &ldquo;Generate Insights&rdquo; to get AI-powered analysis of your {period.label} GST data.
          </p>
        </div>
      )}
    </div>
  )
}
