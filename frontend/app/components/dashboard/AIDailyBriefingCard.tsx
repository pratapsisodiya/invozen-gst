'use client'
import { useState, useEffect, useCallback, startTransition } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, DollarSign, BarChart2, CheckCircle2, ChevronRight } from 'lucide-react'
import type { BriefingItem } from '@/app/api/ai/daily-briefing/route'

const ICON_MAP = {
  alert: AlertTriangle,
  money: DollarSign,
  tax: BarChart2,
  chart: TrendingUp,
  check: CheckCircle2,
}

const TYPE_STYLES = {
  urgent: { bg: 'bg-err-50', border: 'border-err-200', badge: 'bg-err-100 text-err-700', dot: 'bg-err-500' },
  action: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  insight: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  tip: { bg: 'bg-brand-50', border: 'border-brand-200', badge: 'bg-brand-100 text-brand-700', dot: 'bg-brand-500' },
}

const CACHE_KEY = 'invozen-ai-briefing-cache'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const STALE_WARN_MS = 15 * 60 * 1000 // show stale badge after 15 minutes

function loadCache(): { items: BriefingItem[]; cachedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { items: BriefingItem[]; cachedAt: number }
  } catch { return null }
}

function saveCache(items: BriefingItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ items, cachedAt: Date.now() }))
  } catch { /* noop */ }
}

export function AIDailyBriefingCard() {
  const { invoices } = useInvoiceStore()
  const { customers } = useCustomerStore()
  const { getItcSummary } = usePurchaseStore()
  const { profile } = useBusinessStore()

  const [items, setItems] = useState<BriefingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const isStale = loadedAt ? Date.now() - loadedAt.getTime() > STALE_WARN_MS : false

  const fetchBriefing = useCallback(async (force = false) => {
    if (!force) {
      const cached = loadCache()
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        setItems(cached.items)
        setLoadedAt(new Date(cached.cachedAt))
        return
      }
    }

    setLoading(true)
    setError(false)

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const monthInvoices = invoices.filter((inv) => {
      if (inv.status === 'void' || inv.status === 'draft') return false
      const d = new Date(inv.invoiceDate)
      return d.getMonth() + 1 === month && d.getFullYear() === year
    })

    const revenue = monthInvoices.reduce((s, inv) => s + inv.grandTotal, 0)
    const gstCollected = monthInvoices.reduce((s, inv) => s + inv.cgstTotal + inv.sgstTotal + inv.igstTotal, 0)
    const overdue = invoices.filter((i) => i.status === 'overdue')
    const outstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue')
    const itc = getItcSummary()

    try {
      const res = await fetch('/api/ai/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: profile.businessName,
          gstin: profile.gstin,
          state: profile.state,
          revenue,
          outstanding: outstanding.reduce((s, i) => s + i.balanceDue, 0),
          overdue: overdue.reduce((s, i) => s + i.balanceDue, 0),
          overdueCount: overdue.length,
          gstCollected,
          itcAvailable: itc.available,
          itcPending: itc.pending,
          netPayable: Math.max(0, gstCollected - itc.claimed),
          totalInvoices: invoices.length,
          totalCustomers: customers.length,
          nextFilingDate: null,
          recentInvoiceCount: monthInvoices.length,
          todayDate: now.toISOString().split('T')[0],
        }),
      })

      if (!res.ok) throw new Error()
      const data = await res.json() as { items: BriefingItem[] }
      const briefItems = data.items || []
      setItems(briefItems)
      saveCache(briefItems)
      setLoadedAt(new Date())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [invoices, customers, profile, getItcSummary])

  useEffect(() => {
    startTransition(() => { fetchBriefing() })
  }, [])

  if (error) return null

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AI Daily Briefing</p>
            {loadedAt && !loading && (
              <p className="text-[10px] text-white/60 flex items-center gap-1">
                {loadedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                {isStale && <span className="px-1 py-0.5 rounded bg-amber-400/30 text-amber-200 text-[9px] font-semibold uppercase">stale</span>}
              </p>
            )}
          </div>
        </div>
        <button onClick={() => fetchBriefing(true)} disabled={loading}
          className="flex items-center gap-1 text-xs text-white/80 hover:text-white disabled:opacity-50 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && items.length === 0 ? (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded animate-pulse w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No briefing items — business is on track!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((item, idx) => {
              const style = TYPE_STYLES[item.type]
              const Icon = ICON_MAP[item.icon]
              return (
                <div key={idx} className={`flex items-start gap-3 rounded-lg p-3 ${style.bg} border ${style.border}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${style.badge}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{item.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${style.badge}`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.detail}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-faint)' }} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
