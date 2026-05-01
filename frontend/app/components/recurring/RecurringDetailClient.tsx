'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useRecurringStore } from '@/lib/store/recurringStore'
import { useUIStore } from '@/lib/store/uiStore'
import { TopBar } from '../app/TopBar'
import { AmountDisplay } from '../ui/AmountDisplay'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatDate } from '@/lib/utils/formatters'
import { Zap, Pause, Play, Trash2 } from 'lucide-react'
import { FREQUENCY_LABELS } from '@/types/recurring'
import type { RecurringStatus } from '@/types/recurring'

const STATUS_COLORS: Record<RecurringStatus, { bg: string; text: string }> = {
  active: { bg: '#ECFDF5', text: '#059669' },
  paused: { bg: '#FFF7ED', text: '#EA580C' },
  completed: { bg: '#EEF2FF', text: '#4F46E5' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
}

export function RecurringDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { templates, logs, generateNow, pauseTemplate, resumeTemplate, deleteTemplate } = useRecurringStore()
  const { addToast } = useUIStore()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [pauseReason, setPauseReason] = useState('')

  const template = templates.find((t) => t.id === id)
  if (!template) return (
    <div className="flex flex-col flex-1">
      <TopBar title="Template Not Found" breadcrumb={[{ label: 'Recurring', href: '/recurring' }]} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: 'var(--text-muted)' }}>Template not found.</p></div>
    </div>
  )

  const templateLogs = logs.filter((l) => l.templateId === id)
  const sc = STATUS_COLORS[template.status]
  const amount = template.lineItems.reduce((s, li) => s + li.totalAmount, 0)

  const handleGenerate = () => {
    const invoiceId = generateNow(id)
    if (invoiceId) { addToast({ type: 'success', title: 'Invoice generated' }); router.push(`/invoices/${invoiceId}`) }
    else addToast({ type: 'error', title: 'Could not generate — template not active' })
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={template.name}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Recurring', href: '/recurring' }]}
        actions={
          <div className="flex gap-2 no-print">
            {template.status === 'active' && (
              <>
                <button onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                  <Zap className="w-4 h-4" /> Generate Now
                </button>
                <button onClick={() => setPauseOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  <Pause className="w-4 h-4" /> Pause
                </button>
              </>
            )}
            {template.status === 'paused' && (
              <button onClick={() => { resumeTemplate(id); addToast({ type: 'success', title: 'Template resumed' }) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
                <Play className="w-4 h-4" /> Resume
              </button>
            )}
            <button onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-err-600 hover:bg-err-50 text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--border)' }}>
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full flex flex-col gap-4">
        {/* Info card */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex flex-wrap justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Customer</p>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>{template.customerSnapshot.name}</p>
                {template.customerSnapshot.gstin && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{template.customerSnapshot.gstin}</p>}
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Frequency</p><p style={{ color: 'var(--text)' }}>{FREQUENCY_LABELS[template.frequency]}{template.frequency === 'custom' ? ` (${template.customDays}d)` : ''}</p></div>
                <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Start Date</p><p style={{ color: 'var(--text)' }}>{formatDate(template.startDate)}</p></div>
                {template.endDate && <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>End Date</p><p style={{ color: 'var(--text)' }}>{formatDate(template.endDate)}</p></div>}
                <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Next Generation</p><p className="font-medium" style={{ color: 'var(--text)' }}>{formatDate(template.nextGenerationDate)}</p></div>
                <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Auto-Send</p><p style={{ color: 'var(--text)' }}>{template.autoSend ? 'Yes' : 'No'}</p></div>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: sc.bg, color: sc.text }}>{template.status}</span>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Generated: {template.totalGenerated}</p>
              <span style={{ color: 'var(--text)' }}><AmountDisplay amount={amount} className="text-xl font-bold mt-1" /></span>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>per invoice</p>
            </div>
          </div>
          {template.status === 'paused' && template.pausedReason && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <p className="text-sm text-orange-700">Paused: {template.pausedReason}</p>
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="rounded-xl bg-white p-4 overflow-x-auto" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Line Items</h3>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Description', 'Qty', 'Rate', 'GST%', 'Total'].map((h) => (
                  <th key={h} className="pb-2 text-left text-[11px] font-semibold uppercase pr-3" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {template.lineItems.map((li) => (
                <tr key={li.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{li.description}</td>
                  <td className="py-2 pr-3" style={{ color: 'var(--text-2)' }}>{li.quantity} {li.unit}</td>
                  <td className="py-2 pr-3"><AmountDisplay amount={li.rate} /></td>
                  <td className="py-2 pr-3" style={{ color: 'var(--text-2)' }}>{li.gstRate}%</td>
                  <td className="py-2 font-medium"><AmountDisplay amount={li.totalAmount} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Generation log */}
        <div className="rounded-xl bg-white p-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Generation History</h3>
          {templateLogs.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No invoices generated yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Invoice #', 'Generated At', 'Status'].map((h) => (
                    <th key={h} className="pb-2 text-left text-[11px] font-semibold uppercase pr-3" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templateLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-3">
                      <a href={`/invoices/${log.invoiceId}`} className="text-brand-600 hover:underline font-mono text-xs">{log.invoiceNumber}</a>
                    </td>
                    <td className="py-2 pr-3 text-xs" style={{ color: 'var(--text-2)' }}>{formatDate(log.generatedAt.split('T')[0])}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${log.status === 'failed' ? 'bg-red-50 text-red-600' : log.status === 'sent' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        {log.status}
                      </span>
                      {log.error && <p className="text-xs text-red-500 mt-0.5">{log.error}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pause modal */}
      {pauseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl bg-white p-6 w-full max-w-sm" style={{ boxShadow: 'var(--shadow-xl)' }}>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>Pause Template</h2>
            <textarea value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} placeholder="Reason for pausing..." rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600/20" style={{ border: '1px solid var(--border)' }} />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setPauseOpen(false)} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
              <button onClick={() => { pauseTemplate(id, pauseReason); addToast({ type: 'success', title: 'Template paused' }); setPauseOpen(false) }}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium">Pause</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Template"
        message="This recurring template will be permanently deleted. Generated invoices will remain."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { deleteTemplate(id); addToast({ type: 'success', title: 'Template deleted' }); router.push('/recurring') }}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  )
}
