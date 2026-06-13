'use client'
import type { AgentAction, AgentActionGroup } from '@/types/agentAction'
import { ActionCard } from './ActionCard'

interface Props {
  group: AgentActionGroup
  actions: AgentAction[]
  onExplain: (action: AgentAction) => void
  onDismiss: (action: AgentAction) => void
}

export function ActionDeskList({ group, actions, onExplain, onDismiss }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{group}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {actions.length} active action{actions.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <div className="grid xl:grid-cols-2 gap-3">
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} onExplain={onExplain} onDismiss={onDismiss} />
        ))}
      </div>
    </section>
  )
}
