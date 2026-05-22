'use client'
import { useState, useMemo } from 'react'
import { AlertOctagon, Loader2, Copy, Check, Trash2, Plus, ShieldAlert } from 'lucide-react'
import { TopBar } from '../app/TopBar'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useNoticeStore } from '@/lib/store/noticeStore'
import { useUIStore } from '@/lib/store/uiStore'
import type { Notice, NoticeType, NoticeAIResult } from '@/types/notice'

const NOTICE_TYPES: { value: NoticeType; label: string }[] = [
  { value: 'demand_notice', label: 'Demand Notice (DRC-01)' },
  { value: 'show_cause', label: 'Show Cause Notice (SCN)' },
  { value: 'deficiency_memo', label: 'Deficiency Memo (REG-03)' },
  { value: 'audit_notice', label: 'Audit Notice' },
  { value: 'scrutiny', label: 'Scrutiny Notice (ASMT-10)' },
  { value: 'other', label: 'Other' },
]

const RISK_CONFIG = {
  low: { label: 'Low Risk', color: 'var(--ok-600)', bg: 'var(--ok-50)' },
  medium: { label: 'Medium Risk', color: 'var(--warn-700)', bg: 'var(--warn-50)' },
  high: { label: 'High Risk', color: 'var(--err-600)', bg: 'var(--err-50)' },
}

function generateId() {
  return `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function GSTNoticeClient() {
  const { profile } = useBusinessStore()
  const { invoices } = useInvoiceStore()
  const { notices, saveNotice, updateNoticeReply, deleteNotice } = useNoticeStore()
  const { addToast } = useUIStore()

  const [noticeText, setNoticeText] = useState('')
  const [noticeType, setNoticeType] = useState<NoticeType>('demand_notice')
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<NoticeAIResult | null>(null)
  const [editableReply, setEditableReply] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'new' | 'saved'>('new')

  const businessContext = useMemo(() => {
    const totalTaxable = invoices
      .filter((i) => i.status !== 'draft' && i.status !== 'void')
      .reduce((s, i) => s + i.taxableValue, 0)
    const totalTax = invoices
      .filter((i) => i.status !== 'draft' && i.status !== 'void')
      .reduce((s, i) => s + i.totalTax, 0)
    return {
      gstin: profile.gstin,
      businessName: profile.businessName,
      totalTaxable,
      totalTax,
    }
  }, [profile, invoices])

  const handleAnalyze = async () => {
    if (!noticeText.trim() || noticeText.length < 20) {
      addToast({ type: 'error', title: 'Input Required', message: 'Please paste the notice text (at least 20 characters)' })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/gst-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noticeText, noticeType, period, businessContext }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as NoticeAIResult
      setResult(data)
      setEditableReply(data.suggestedReply)
    } catch {
      addToast({ type: 'error', title: 'AI Error', message: 'Could not analyze notice. Check AI configuration.' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!result) return
    const notice: Notice = {
      id: generateId(),
      noticeText,
      noticeType,
      period,
      aiResult: result,
      savedReply: editableReply,
      createdAt: new Date().toISOString(),
    }
    saveNotice(notice)
    addToast({ type: 'success', title: 'Saved', message: 'Notice saved' })
    setActiveTab('saved')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editableReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([editableReply], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gst-notice-reply-${period || 'draft'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="GST Notice Intelligence"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4 max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {(['new', 'saved'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{
                background: activeTab === tab ? 'white' : 'transparent',
                color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {tab === 'new' ? 'Analyze Notice' : `Saved (${notices.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'new' && (
          <>
            {/* Info banner */}
            <div className="flex gap-3 items-start px-4 py-3 rounded-xl" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}>
              <AlertOctagon className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
              <p className="text-[13px]" style={{ color: 'var(--brand-700)' }}>
                Paste any GST notice (demand notice, SCN, deficiency memo, audit notice) and get an AI-drafted structured reply. Your GSTIN and business data are pre-filled automatically.
              </p>
            </div>

            {/* Input form */}
            <div
              className="rounded-xl bg-white p-4 flex flex-col gap-4"
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>Notice Type</label>
                  <select
                    className="px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    value={noticeType}
                    onChange={(e) => setNoticeType(e.target.value as NoticeType)}
                  >
                    {NOTICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>Period (e.g. Apr 2024 – Mar 2025)</label>
                  <input
                    type="text"
                    className="px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="FY 2023-24"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>Notice Text — Paste the full notice here</label>
                <textarea
                  className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none font-mono"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', minHeight: 180 }}
                  placeholder="Paste the GST notice text here…"
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                />
                <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{noticeText.length} characters</p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading || noticeText.length < 20}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing notice…</>
                ) : (
                  <><ShieldAlert className="w-4 h-4" /> Analyze &amp; Draft Reply</>
                )}
              </button>
            </div>

            {/* Results */}
            {result && (
              <div className="flex flex-col gap-3">
                {/* Summary row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-white p-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Notice Type</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>
                      {NOTICE_TYPES.find((t) => t.value === result.noticeType)?.label ?? result.noticeType}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Risk Level</p>
                    <span
                      className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: RISK_CONFIG[result.riskLevel]?.bg,
                        color: RISK_CONFIG[result.riskLevel]?.color,
                      }}
                    >
                      {RISK_CONFIG[result.riskLevel]?.label}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Deadline</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: result.deadline ? 'var(--err-600)' : 'var(--text-muted)' }}>
                      {result.deadline ?? 'Not specified'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Action Items</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{result.actionItems.length} steps</p>
                  </div>
                </div>

                {/* Key demands */}
                <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Key Demands</p>
                  <ul className="flex flex-col gap-1.5">
                    {result.keyDemands.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px]">
                        <span className="w-4 h-4 rounded-full bg-err-100 text-err-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <span style={{ color: 'var(--text-2)' }}>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action items */}
                <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Action Items</p>
                  <ul className="flex flex-col gap-1.5">
                    {result.actionItems.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px]">
                        <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <span style={{ color: 'var(--text-2)' }}>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Editable reply */}
                <div className="rounded-xl bg-white p-4 flex flex-col gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI-Drafted Reply — Edit before sending</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-ink-50 transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-ok-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-ink-50 transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        Download .txt
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors"
                      >
                        Save Notice
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', minHeight: 280, fontFamily: 'inherit' }}
                    value={editableReply}
                    onChange={(e) => setEditableReply(e.target.value)}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'saved' && (
          <div className="flex flex-col gap-3">
            {notices.length === 0 ? (
              <div className="rounded-xl bg-white p-12 text-center" style={{ border: '1px solid var(--border)' }}>
                <AlertOctagon className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No saved notices</p>
                <button
                  onClick={() => setActiveTab('new')}
                  className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <Plus className="w-4 h-4" /> Analyze a notice
                </button>
              </div>
            ) : (
              notices.map((n) => (
                <SavedNoticeRow
                  key={n.id}
                  notice={n}
                  onDelete={() => deleteNotice(n.id)}
                  onUpdateReply={(reply) => updateNoticeReply(n.id, reply)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SavedNoticeRow({
  notice,
  onDelete,
  onUpdateReply,
}: {
  notice: Notice
  onDelete: () => void
  onUpdateReply: (r: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editReply, setEditReply] = useState(notice.savedReply)
  const [copied, setCopied] = useState(false)
  const { addToast } = useUIStore()

  const risk = notice.aiResult?.riskLevel ?? 'low'
  const riskCfg = RISK_CONFIG[risk]

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-ink-50/50"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: riskCfg.bg, color: riskCfg.color }}
          >
            {riskCfg.label}
          </span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {NOTICE_TYPES.find((t) => t.value === notice.noticeType)?.label ?? notice.noticeType}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {notice.period || 'Period not set'} · {new Date(notice.createdAt).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1.5 rounded hover:bg-err-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-err-500" />
        </button>
      </div>

      {expanded && notice.aiResult && (
        <div className="border-t p-4 flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Key Demands: </span>
              <span style={{ color: 'var(--text-2)' }}>{notice.aiResult.keyDemands.join(' · ')}</span>
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Deadline: </span>
              <span style={{ color: notice.aiResult.deadline ? 'var(--err-600)' : 'var(--text-muted)' }}>
                {notice.aiResult.deadline ?? 'Not specified'}
              </span>
            </div>
          </div>
          <textarea
            className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text)', minHeight: 200, fontFamily: 'inherit' }}
            value={editReply}
            onChange={(e) => setEditReply(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-ink-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-ok-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Reply'}
            </button>
            <button
              onClick={() => { onUpdateReply(editReply); addToast({ type: 'success', title: 'Saved', message: 'Reply saved' }) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
