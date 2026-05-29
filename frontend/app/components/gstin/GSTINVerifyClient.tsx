'use client'
import { useState } from 'react'
import { TopBar } from '../app/TopBar'
import { Badge } from '../ui/Badge'
import { ShieldCheck, ShieldX, Search, Loader2, Clock } from 'lucide-react'

interface VerifyResult {
  gstin: string
  isValid: boolean
  checksumValid?: boolean
  stateCode?: string
  state?: string
  panNumber?: string
  entityType?: string
  registrationType?: string
  status?: string
  verifiedAt?: string
  note?: string
  error?: string
}

const RECENT_KEY = 'invozen-gstin-recent'

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[] } catch { return [] }
}

function saveRecent(gstin: string) {
  const list = getRecent().filter((g) => g !== gstin).slice(0, 9)
  localStorage.setItem(RECENT_KEY, JSON.stringify([gstin, ...list]))
}

export function GSTINVerifyClient() {
  const [gstin, setGstin] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [recentList, setRecentList] = useState<string[]>(() => {
    if (typeof window !== 'undefined') return getRecent()
    return []
  })

  const handleVerify = async (g?: string) => {
    const target = (g || gstin).trim().toUpperCase()
    if (!target) return
    setGstin(target)
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/gstin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin: target }),
      })
      const data = await res.json() as VerifyResult
      setResult(data)
      if (data.isValid) {
        saveRecent(target)
        setRecentList(getRecent())
      }
    } catch {
      setResult({ gstin: target, isValid: false, error: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const statusColor = result?.status === 'Active' ? 'success' : result?.status === 'Cancelled' ? 'error' : result?.status === 'Suspended' ? 'warning' : 'neutral'

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="GSTIN Verification" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]} />

      <div className="flex-1 p-4 lg:p-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
        {/* Main search */}
        <div className="rounded-xl bg-white p-6" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>GSTIN Format Validator</h3>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Validates structure, extracts state, PAN, entity type, and verifies Mod-36 checksum.</p>
          <p className="text-[11px] mb-4 px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 inline-flex gap-1 items-center">
            ⚠️ This is a <strong>local format check only</strong> — it does not query the GST portal. A structurally valid GSTIN may still be cancelled or inactive.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="e.g. 27ABCDE1234F1Z5"
                maxLength={15}
                className="w-full h-11 rounded-lg border px-4 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
                style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
            <button onClick={() => handleVerify()} disabled={loading || !gstin.trim()}
              className="flex items-center gap-2 px-5 h-11 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Verify
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-xl bg-white p-5" style={{ border: `2px solid ${result.isValid ? 'var(--brand-600)' : '#ef4444'}`, boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-3 mb-4">
              {result.isValid
                ? <ShieldCheck className="w-6 h-6 text-brand-600" />
                : <ShieldX className="w-6 h-6 text-red-500" />}
              <div>
                <p className="font-mono text-lg font-bold" style={{ color: 'var(--text)' }}>{result.gstin}</p>
                {result.isValid
                  ? <p className="text-xs font-medium text-brand-600">Format valid · local check</p>
                  : <p className="text-xs font-medium text-red-500">{result.error || 'Invalid GSTIN'}</p>}
              </div>
              {result.status && <Badge variant={statusColor as 'success' | 'error' | 'warning' | 'neutral'}>{result.status}</Badge>}
            </div>

            {result.isValid && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'State', value: result.state },
                  { label: 'State Code', value: result.stateCode },
                  { label: 'PAN Number', value: result.panNumber },
                  { label: 'Entity Type', value: result.entityType },
                  { label: 'Registration Type', value: result.registrationType },
                  { label: 'Checksum', value: result.checksumValid ? '✓ Valid' : '✗ Invalid' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-3" style={{ background: 'var(--surface)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{value || '—'}</p>
                  </div>
                ))}
              </div>
            )}

            {result.note && (
              <p className="text-xs mt-3 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">{result.note}</p>
            )}
          </div>
        )}

        {/* Recent verifications */}
        {recentList.length > 0 && (
          <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Recent Verifications</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentList.map((g) => (
                <button key={g} onClick={() => handleVerify(g)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium hover:bg-brand-50 transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>GSTIN Structure Guide</p>
          <div className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            <p><span className="text-brand-600 font-bold">27</span> ABCDE 1234 F 1 Z 5</p>
            <p className="mt-1">└─ State code (27=Maharashtra) · PAN · Entity · Check digit</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <p>01 = J&K · 02 = HP · 03 = Punjab</p>
            <p>06 = Haryana · 07 = Delhi · 08 = Rajasthan</p>
            <p>27 = Maharashtra · 29 = Karnataka</p>
            <p>32 = Kerala · 33 = Tamil Nadu · 36 = Telangana</p>
          </div>
        </div>
      </div>
    </div>
  )
}
