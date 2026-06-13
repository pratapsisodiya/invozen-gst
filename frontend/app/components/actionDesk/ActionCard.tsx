'use client'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { AgentAction } from '@/types/agentAction'

interface Props {
  action: AgentAction
  onExplain: (action: AgentAction) => void
  onDismiss: (action: AgentAction) => void
}

const URGENCY_STYLES = {
  high: { badge: 'bg-err-100 text-err-700' },
  medium: { badge: 'bg-warn-100 text-warn-700' },
  low: { badge: 'bg-brand-100 text-brand-700' },
} as const

const STATUS_STYLES: Record<NonNullable<AgentAction['statusLabel']>, string> = {
  Insight: 'bg-ink-100 text-ink-700',
  'Queued Approval': 'bg-blue-100 text-blue-700',
  Autopilot: 'bg-brand-100 text-brand-700',
  Exception: 'bg-err-100 text-err-700',
}

export function ActionCard({ action, onExplain, onDismiss }: Props) {
  const router = useRouter()
  const styles = URGENCY_STYLES[action.urgency]

  return (
    <div
      className="rounded-2xl bg-white p-4 flex flex-col gap-3"
      style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{action.title}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${styles.badge}`}>
              {action.urgency}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase"
              style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {action.confidence}
            </span>
            {action.statusLabel && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${STATUS_STYLES[action.statusLabel]}`}>
                {action.statusLabel}
              </span>
            )}
            {action.source === 'copilot' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase bg-brand-100 text-brand-700">
                Copilot
              </span>
            )}
            {action.source === 'autopilot' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase bg-blue-100 text-blue-700">
                Autopilot
              </span>
            )}
          </div>
          <p className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>{action.summary}</p>
        </div>
        <button
          onClick={() => onDismiss(action)}
          className="p-1 rounded-md hover:bg-ink-50 transition-colors"
          aria-label="Dismiss action"
        >
          <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
        <p className="text-[11px] uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
          Impact
        </p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{action.impactLabel}</p>
            {action.impactValue !== undefined && (
              <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {action.impactValue.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <button
            onClick={() => onExplain(action)}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {action.secondaryActionLabel ?? 'Why this?'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {action.targetHref && (
          <button
            onClick={() => router.push(action.targetHref!)}
            className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {action.primaryActionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
        {!action.targetHref && (
          <button
            onClick={() => onExplain(action)}
            className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Review
          </button>
        )}
      </div>
    </div>
  )
}
