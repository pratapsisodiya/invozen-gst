'use client'
import { useMemo, useState } from 'react'
import { useFilingStore } from '@/lib/store/filingStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { TopBar } from '../app/TopBar'
import { useUIStore } from '@/lib/store/uiStore'
import type { FilingType, FilingStatus, FilingRecord } from '@/types/filing'
import type { ChecklistItem } from '@/app/api/ai/filing-checklist/route'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, FileCheck, Sparkles, Loader2 } from 'lucide-react'

const FILING_TYPES: FilingType[] = ['GSTR-1', 'GSTR-3B', 'GSTR-9']
const STATUS_LABELS: Record<FilingStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  reviewed: 'Reviewed',
  filed: 'Filed',
}
const STATUS_COLORS: Record<FilingStatus, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-50 text-blue-700',
  reviewed: 'bg-warn-50 text-warn-700',
  filed: 'bg-ok-50 text-ok-700',
}

function PeriodLabel({ period }: { period: string }) {
  const [year, month] = period.split('-')
  const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return <span>{month ? `${MONTHS[parseInt(month)]} ${year}` : `FY ${year}`}</span>
}

function FilingCard({ record }: { record: FilingRecord }) {
  const { updateStatus, toggleChecklistItem, updateNotes, setChecklistItems } = useFilingStore()
  const { invoices } = useInvoiceStore()
  const { purchases } = usePurchaseStore()
  const { profile } = useBusinessStore()
  const { addToast } = useUIStore()
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(record.notes || '')
  const [aiLoading, setAiLoading] = useState(false)

  const handleAIChecklist = async () => {
    setAiLoading(true)
    try {
      const [year, month] = record.period.split('-')
      const period = month ? `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(month)]} ${year}` : year
      const periodInvoices = invoices.filter((inv) => {
        if (!month) return true
        const d = new Date(inv.invoiceDate)
        return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year)
      })
      const creditNoteCount = periodInvoices.filter((i) => (i.grandTotal ?? 0) < 0).length
      const b2bCount = periodInvoices.filter((i) => i.customerSnapshot?.gstin).length

      const res = await fetch('/api/ai/filing-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filingType: record.type,
          period,
          businessProfile: {
            registrationType: 'Regular',
            filingFrequency: 'monthly',
            state: profile.state || 'Karnataka',
            industry: profile.industry || 'General',
          },
          dataSummary: {
            invoiceCount: periodInvoices.length,
            purchaseCount: purchases.length,
            creditNoteCount,
            b2bCount,
            hasExports: false,
            hasNilRated: periodInvoices.some((i) => i.lineItems.some((li) => li.gstRate === 0)),
          },
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as { items: ChecklistItem[]; deadlineWarning: string | null }
      const newItems = data.items.map((item) => ({ id: item.id, label: `[${item.priority.toUpperCase()}] ${item.title}: ${item.description}`, completed: false }))
      setChecklistItems(record.id, newItems)
      if (data.deadlineWarning) {
        addToast({ type: 'info', title: 'Deadline Warning', message: data.deadlineWarning })
      } else {
        addToast({ type: 'success', title: 'AI Checklist generated', message: `${data.items.length} items` })
      }
      if (!expanded) setExpanded(true)
    } catch {
      addToast({ type: 'error', title: 'AI checklist failed', message: 'Please try again' })
    } finally {
      setAiLoading(false)
    }
  }

  const doneCount = record.checklistItems.filter((c) => c.completed).length
  const pct = record.checklistItems.length === 0 ? 0 : Math.round((doneCount / record.checklistItems.length) * 100)

  const handleAdvance = () => {
    const next: FilingStatus =
      record.status === 'not_started' ? 'in_progress'
      : record.status === 'in_progress' ? 'reviewed'
      : record.status === 'reviewed' ? 'filed'
      : 'filed'
    updateStatus(record.id, next, 'You')
    addToast({ type: 'success', title: `Status → ${STATUS_LABELS[next]}` })
  }

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}
        style={{ background: 'var(--surface)', borderBottom: expanded ? '1px solid var(--border)' : undefined }}>
        <div className="flex items-center gap-3">
          <FileCheck className="w-4 h-4 text-brand-600" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{record.type}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <PeriodLabel period={record.period} /> · Due {new Date(record.dueDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[record.status]}`}>
            {STATUS_LABELS[record.status]}
          </span>
          <button onClick={(e) => { e.stopPropagation(); void handleAIChecklist() }} disabled={aiLoading}
            className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors px-1.5 py-0.5 rounded hover:bg-brand-50">
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI
          </button>
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 flex flex-col gap-4">
          {/* Progress */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Checklist Progress</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{doneCount}/{record.checklistItems.length}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
              <div className="h-1.5 rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Checklist */}
          <div className="flex flex-col gap-2">
            {record.checklistItems.map((item) => (
              <button key={item.id} onClick={() => toggleChecklistItem(record.id, item.id)}
                className="flex items-center gap-2.5 text-left">
                {item.completed
                  ? <CheckCircle2 className="w-4 h-4 text-ok-600 flex-shrink-0" />
                  : <Circle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
                <span className={`text-[13px] ${item.completed ? 'line-through' : ''}`}
                  style={{ color: item.completed ? 'var(--text-muted)' : 'var(--text)' }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              onBlur={() => updateNotes(record.id, notes)}
              rows={2} placeholder="Add notes for this filing..."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {record.status !== 'filed' && (
              <button onClick={handleAdvance}
                className="flex-1 h-8 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors">
                Advance: → {STATUS_LABELS[
                  record.status === 'not_started' ? 'in_progress'
                  : record.status === 'in_progress' ? 'reviewed'
                  : 'filed'
                ]}
              </button>
            )}
            {record.status === 'filed' && (
              <div className="flex-1 h-8 flex items-center justify-center rounded-lg bg-ok-50 text-ok-700 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Filed on {record.filedDate ? new Date(record.filedDate).toLocaleDateString('en-IN') : '-'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function FilingWorkflowClient() {
  const { records, getOrCreate } = useFilingStore()
  const [activeType, setActiveType] = useState<FilingType | 'all'>('all')

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Ensure current period records exist
  useMemo(() => {
    const months = [currentMonth - 1, currentMonth].map((m) => {
      const adjusted = m <= 0 ? 12 : m
      const y = m <= 0 ? currentYear - 1 : currentYear
      return { m: adjusted, y }
    })
    for (const { m, y } of months) {
      const period = `${y}-${String(m).padStart(2, '0')}`
      getOrCreate('GSTR-1', period, new Date(y, m - 1, 11).toISOString())
      getOrCreate('GSTR-3B', period, new Date(y, m - 1, 20).toISOString())
    }
    getOrCreate('GSTR-9', `${currentYear - 1}-annual`, new Date(currentYear, 11, 31).toISOString())
  }, [])

  const filtered = records.filter((r) => activeType === 'all' || r.type === activeType)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Filing Workflow" />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap">
          {(['all', ...FILING_TYPES] as const).map((t) => (
            <button key={t} onClick={() => setActiveType(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeType === t ? 'bg-brand-600 text-white' : 'border hover:bg-ink-50'}`}
              style={activeType !== t ? { borderColor: 'var(--border)', color: 'var(--text-2)' } : {}}>
              {t === 'all' ? 'All Returns' : t}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.length === 0
            ? <div className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No filings found</div>
            : filtered.map((r) => <FilingCard key={r.id} record={r} />)}
        </div>
      </div>
    </div>
  )
}
