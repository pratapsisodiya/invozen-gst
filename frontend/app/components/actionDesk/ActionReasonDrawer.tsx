'use client'
import { Drawer } from '@/app/components/ui/Drawer'
import type { AgentAction } from '@/types/agentAction'

interface Props {
  action: AgentAction | null
  open: boolean
  onClose: () => void
}

export function ActionReasonDrawer({ action, open, onClose }: Props) {
  return (
    <Drawer open={open} onClose={onClose} title={action ? action.title : 'Action details'}>
      {action && (
        <div className="p-5 flex flex-col gap-4">
          <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
              Summary
            </p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{action.summary}</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Why it matters
            </p>
            <p className="text-sm leading-6" style={{ color: 'var(--text)' }}>{action.reason}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Impact</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>
                {action.impactLabel}
              </p>
              {action.impactValue !== undefined && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {action.impactValue.toLocaleString('en-IN')}
                </p>
              )}
            </div>

            <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Confidence</p>
              <p className="text-sm font-semibold mt-0.5 capitalize" style={{ color: 'var(--text)' }}>
                {action.confidence}
              </p>
              <p className="text-xs mt-1 capitalize" style={{ color: 'var(--text-muted)' }}>
                {action.urgency} urgency
              </p>
            </div>
          </div>

          {action.statusLabel && (
            <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                Workflow Status
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{action.statusLabel}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Source: {action.source ?? 'system'}
              </p>
            </div>
          )}

          {action.targetHref && (
            <div className="rounded-xl p-3" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--brand-700)' }}>
                Recommended next step
              </p>
              <p className="text-sm" style={{ color: 'var(--brand-700)' }}>{action.primaryActionLabel}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{action.targetHref}</p>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
