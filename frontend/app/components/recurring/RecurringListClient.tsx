'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRecurringStore } from '@/lib/store/recurringStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { Tabs } from '../ui/Tabs'
import { AmountDisplay } from '../ui/AmountDisplay'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatDate } from '@/lib/utils/formatters'
import { Plus, RefreshCw, Pause, Play, Trash2, Eye, Zap } from 'lucide-react'
import { FREQUENCY_LABELS } from '@/types/recurring'
import type { RecurringStatus } from '@/types/recurring'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS: Record<RecurringStatus, { bg: string; text: string }> = {
  active: { bg: '#ECFDF5', text: '#059669' },
  paused: { bg: '#FFF7ED', text: '#EA580C' },
  completed: { bg: '#EEF2FF', text: '#4F46E5' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
}

export function RecurringListClient() {
  const { templates, generateNow, pauseTemplate, resumeTemplate, deleteTemplate } = useRecurringStore()
  const { addToast } = useUIStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [pauseTarget, setPauseTarget] = useState<string | null>(null)
  const [pauseReason, setPauseReason] = useState('')

  const filtered = useMemo(() =>
    templates.filter((t) => activeTab === 'all' || t.status === activeTab),
    [templates, activeTab]
  )

  const activeCount = templates.filter((t) => t.status === 'active').length
  const thisMonthExpected = templates
    .filter((t) => t.status === 'active' && t.nextGenerationDate.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, t) => s + t.lineItems.reduce((ls, li) => ls + li.totalAmount, 0), 0)

  const handleGenerate = (id: string) => {
    const invoiceId = generateNow(id)
    if (invoiceId) { addToast({ type: 'success', title: 'Invoice generated' }); router.push(`/invoices/${invoiceId}`) }
    else addToast({ type: 'error', title: 'Could not generate — template not active' })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Recurring Invoices"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <Link href="/recurring/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Template
          </Link>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        {/* Summary bar */}
        <div className="flex gap-4 p-4 rounded-xl bg-white" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Active Templates</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>{activeCount}</p>
          </div>
          <div className="w-px" style={{ background: 'var(--border)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Expected This Month</p>
            <span style={{ color: 'var(--text)' }}><AmountDisplay amount={thisMonthExpected} className="text-xl font-bold" /></span>
          </div>
        </div>

        <Tabs tabs={STATUS_TABS} activeTab={activeTab} onChange={setActiveTab} />

        {/* Desktop table */}
        <div className="hidden lg:block rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Customer', 'Frequency', 'Next Date', 'Amount', 'Generated', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No templates found</td></tr>
              ) : filtered.map((t) => {
                const sc = STATUS_COLORS[t.status]
                const amount = t.lineItems.reduce((s, li) => s + li.totalAmount, 0)
                return (
                  <tr key={t.id} onClick={() => router.push(`/recurring/${t.id}`)}
                    className="cursor-pointer hover:bg-ink-50 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{t.name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-2)' }}>{t.customerSnapshot.name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-2)' }}>{FREQUENCY_LABELS[t.frequency]}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-2)' }}>{formatDate(t.nextGenerationDate)}</td>
                    <td className="px-4 py-3 font-semibold"><AmountDisplay amount={amount} /></td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-2)' }}>{t.totalGenerated}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {t.status === 'active' && (
                          <>
                            <button onClick={() => handleGenerate(t.id)} title="Generate Now"
                              className="p-1.5 rounded hover:bg-brand-50 transition-colors">
                              <Zap className="w-3.5 h-3.5 text-brand-600" />
                            </button>
                            <button onClick={() => setPauseTarget(t.id)} title="Pause"
                              className="p-1.5 rounded hover:bg-orange-50 transition-colors">
                              <Pause className="w-3.5 h-3.5 text-orange-500" />
                            </button>
                          </>
                        )}
                        {t.status === 'paused' && (
                          <button onClick={() => { resumeTemplate(t.id); addToast({ type: 'success', title: 'Template resumed' }) }} title="Resume"
                            className="p-1.5 rounded hover:bg-green-50 transition-colors">
                            <Play className="w-3.5 h-3.5 text-green-600" />
                          </button>
                        )}
                        <button onClick={() => router.push(`/recurring/${t.id}`)}
                          className="p-1.5 rounded hover:bg-ink-100 transition-colors">
                          <Eye className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button onClick={() => setDeleteTarget(t.id)} className="p-1.5 rounded hover:bg-err-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-err-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden flex flex-col gap-2">
          {filtered.map((t) => {
            const sc = STATUS_COLORS[t.status]
            const amount = t.lineItems.reduce((s, li) => s + li.totalAmount, 0)
            return (
              <div key={t.id} onClick={() => router.push(`/recurring/${t.id}`)}
                className="rounded-xl bg-white p-4 cursor-pointer" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{t.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.customerSnapshot.name} · {FREQUENCY_LABELS[t.frequency]}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{t.status}</span>
                    <AmountDisplay amount={amount} className="font-semibold text-sm" />
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Next: {formatDate(t.nextGenerationDate)}</p>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No templates found</p>}
        </div>
      </div>

      {/* Pause dialog */}
      {pauseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl bg-white p-6 w-full max-w-sm" style={{ boxShadow: 'var(--shadow-xl)' }}>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>Pause Template</h2>
            <textarea value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} placeholder="Reason for pausing..." rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600/20" style={{ border: '1px solid var(--border)' }} />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setPauseTarget(null)} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
              <button onClick={() => { pauseTemplate(pauseTarget, pauseReason); addToast({ type: 'success', title: 'Template paused' }); setPauseTarget(null); setPauseReason('') }}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium">Pause</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Template"
        message="This recurring template will be permanently deleted. Generated invoices will remain."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteTarget) { deleteTemplate(deleteTarget); addToast({ type: 'success', title: 'Template deleted' }) } setDeleteTarget(null) }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
