'use client'
import { useMemo, useState } from 'react'
import { useBusinessStore } from '@/lib/store/businessStore'
import { generateComplianceEvents, daysUntilDue } from '@/lib/gst/complianceCalendar'
import type { ComplianceEvent } from '@/types/compliance'
import { cn } from '@/lib/utils/cn'
import { CheckCircle, Clock, AlertTriangle, Calendar, ChevronRight } from 'lucide-react'
import { TopBar } from '../app/TopBar'

function statusIcon(status: ComplianceEvent['status']) {
  if (status === 'filed') return <CheckCircle className="w-4 h-4 text-green-500" />
  if (status === 'overdue') return <AlertTriangle className="w-4 h-4 text-red-500" />
  return <Clock className="w-4 h-4 text-amber-500" />
}

function statusLabel(event: ComplianceEvent): string {
  if (event.status === 'filed') return `Filed ${event.filedDate ?? ''}`
  if (event.status === 'overdue') {
    const days = Math.abs(daysUntilDue(event.dueDate))
    return `${days} day${days !== 1 ? 's' : ''} overdue`
  }
  const days = daysUntilDue(event.dueDate)
  if (days === 0) return 'Due today'
  return `Due in ${days} day${days !== 1 ? 's' : ''}`
}

function EventCard({ event, onMarkFiled }: { event: ComplianceEvent; onMarkFiled: (id: string) => void }) {
  const urgent = event.status === 'overdue' || (event.status === 'pending' && daysUntilDue(event.dueDate) <= 7)
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-xl border bg-white gap-3',
      event.status === 'overdue' && 'border-red-200 bg-red-50',
      event.status === 'filed' && 'border-green-200 bg-green-50',
      event.status === 'pending' && urgent && 'border-amber-200 bg-amber-50',
      event.status === 'pending' && !urgent && 'border-[var(--border)]',
    )}>
      <div className="flex items-center gap-3 min-w-0">
        {statusIcon(event.status)}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[var(--text-primary)]">{event.type}</span>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded">{event.period}</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{statusLabel(event)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-[var(--text-muted)]">Due {new Date(event.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        {event.status !== 'filed' && (
          <button
            onClick={() => onMarkFiled(event.id)}
            className="text-xs px-2.5 py-1 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors font-medium"
          >
            Mark Filed
          </button>
        )}
      </div>
    </div>
  )
}

export function ComplianceCalendarClient() {
  const { settings } = useBusinessStore()
  const freq = settings?.invoiceSettings ? 'monthly' : 'monthly'
  const [filedPeriods, setFiledPeriods] = useState<Record<string, { gstr1?: string; gstr3b?: string }>>({})
  const [tab, setTab] = useState<'upcoming' | 'all'>('upcoming')

  const summary = useMemo(
    () => generateComplianceEvents('monthly', filedPeriods),
    [filedPeriods]
  )

  function handleMarkFiled(id: string) {
    const today = new Date().toISOString().split('T')[0]
    const [type, period] = id.split('-').slice(0, 2).join('-') === 'gstr1' ? ['gstr1', id.replace('gstr1-', '')] : ['gstr3b', id.replace('gstr3b-', '')]
    setFiledPeriods((prev) => ({
      ...prev,
      [period]: { ...prev[period], [type === 'gstr1' ? 'gstr1' : 'gstr3b']: today },
    }))
  }

  const displayEvents = tab === 'upcoming'
    ? [...summary.overdue, ...summary.upcoming]
    : summary.allEvents

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Compliance Calendar" />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border bg-white">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium mb-1">Next Due</p>
            {summary.nextDue ? (
              <>
                <p className="font-bold text-[var(--text-primary)]">{summary.nextDue.type}</p>
                <p className="text-sm text-[var(--text-muted)]">{summary.nextDue.period} — {statusLabel(summary.nextDue)}</p>
              </>
            ) : (
              <p className="font-semibold text-green-600">All up to date</p>
            )}
          </div>

          <div className={cn('p-4 rounded-xl border', summary.overdue.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white')}>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium mb-1">Overdue</p>
            <p className={cn('font-bold text-2xl', summary.overdue.length > 0 ? 'text-red-600' : 'text-green-600')}>
              {summary.overdue.length}
            </p>
            <p className="text-sm text-[var(--text-muted)]">filing{summary.overdue.length !== 1 ? 's' : ''} pending</p>
          </div>

          <div className="p-4 rounded-xl border bg-white col-span-2 lg:col-span-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium mb-1">Filing Mode</p>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span className="font-semibold text-[var(--text-primary)] capitalize">Monthly</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">GSTR-1 by 11th · GSTR-3B by 20th</p>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 p-1 bg-[var(--bg-subtle)] rounded-lg w-fit">
          {(['upcoming', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                tab === t ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {t === 'upcoming' ? 'Upcoming & Overdue' : 'All Filings'}
            </button>
          ))}
        </div>

        {/* Event List */}
        <div className="flex flex-col gap-2">
          {displayEvents.length === 0 ? (
            <div className="text-center py-10 text-[var(--text-muted)]">No filings in this view</div>
          ) : (
            displayEvents.map((event) => (
              <EventCard key={event.id} event={event} onMarkFiled={handleMarkFiled} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
