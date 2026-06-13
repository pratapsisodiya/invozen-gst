'use client'
import { useCallback, useEffect, useMemo, useState, startTransition } from 'react'
import Link from 'next/link'
import { RefreshCw, Sparkles, EyeOff } from 'lucide-react'
import { TopBar } from '@/app/components/app/TopBar'
import { Tabs } from '@/app/components/ui/Tabs'
import { useActionDeskStore } from '@/lib/store/actionDeskStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useCollectionsAutopilotStore } from '@/lib/store/autopilotStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useExpenseStore } from '@/lib/store/expenseStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useRecurringStore } from '@/lib/store/recurringStore'
import { buildActionDeskResponse, type ActionDeskSnapshot } from '@/lib/ai/actionDesk'
import { mapApprovalTaskToAgentAction } from '@/lib/ai/autopilot/actionDesk'
import type { AgentAction, AgentActionGroup, AgentActionResponse } from '@/types/agentAction'
import { ActionDeskList } from './ActionDeskList'
import { ActionReasonDrawer } from './ActionReasonDrawer'

const GROUPS: AgentActionGroup[] = [
  'Collect Money',
  'Save GST / Claim ITC',
  'Fix Compliance Risks',
  'Prepare Filing',
  'Protect Cash',
]

export function ActionDeskClient() {
  const invoices = useInvoiceStore((state) => state.invoices)
  const purchases = usePurchaseStore((state) => state.purchases)
  const expenses = useExpenseStore((state) => state.expenses)
  const customers = useCustomerStore((state) => state.customers)
  const payments = usePaymentStore((state) => state.payments)
  const recurringTemplates = useRecurringStore((state) => state.templates)
  const profile = useBusinessStore((state) => state.profile)
  const settings = useBusinessStore((state) => state.settings)
  const approvalTasks = useCollectionsAutopilotStore((state) => state.approvalTasks)
  const manualActions = useActionDeskStore((state) => state.manualActions)
  const dismissedActionIds = useActionDeskStore((state) => state.dismissedActionIds)
  const dismissAction = useActionDeskStore((state) => state.dismissAction)
  const restoreDismissedActions = useActionDeskStore((state) => state.restoreDismissedActions)

  const [response, setResponse] = useState<AgentActionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeGroup, setActiveGroup] = useState<AgentActionGroup | 'all'>('all')
  const [selectedAction, setSelectedAction] = useState<AgentAction | null>(null)

  const snapshot = useMemo<ActionDeskSnapshot>(() => ({
    invoices,
    purchases,
    expenses,
    customers,
    payments,
    recurringTemplates,
    profile,
    settings,
  }), [customers, expenses, invoices, payments, profile, purchases, recurringTemplates, settings])

  const localResponse = useMemo(() => buildActionDeskResponse(snapshot), [snapshot])

  const loadActions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/action-desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as AgentActionResponse
      setResponse(data)
    } catch {
      setResponse(localResponse)
    } finally {
      setLoading(false)
    }
  }, [localResponse, snapshot])

  useEffect(() => {
    startTransition(() => {
      void loadActions()
    })
  }, [loadActions])

  const mergedActions = useMemo(() => {
    const autopilotActions = approvalTasks
      .filter((task) => task.status === 'queued' || task.status === 'escalated')
      .map(mapApprovalTaskToAgentAction)
    const ordered = [...manualActions, ...autopilotActions, ...(response?.actions ?? localResponse.actions)]
    const deduped = new Map<string, AgentAction>()
    for (const action of ordered) {
      if (!dismissedActionIds.includes(action.id)) deduped.set(action.id, action)
    }
    return Array.from(deduped.values())
  }, [approvalTasks, dismissedActionIds, localResponse.actions, manualActions, response?.actions])

  const groupedActions = useMemo(() => {
    const map = new Map<AgentActionGroup, AgentAction[]>()
    for (const group of GROUPS) map.set(group, [])
    for (const action of mergedActions) {
      const current = map.get(action.group)
      if (current) current.push(action)
    }
    return map
  }, [mergedActions])

  const visibleGroups = useMemo(() => {
    if (activeGroup === 'all') {
      return GROUPS.filter((group) => (groupedActions.get(group)?.length ?? 0) > 0)
    }
    return [activeGroup]
  }, [activeGroup, groupedActions])

  const highUrgencyCount = mergedActions.filter((action) => action.urgency === 'high').length

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="AI Action Desk"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/collections-autopilot"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              Collections Autopilot
            </Link>
            {dismissedActionIds.length > 0 && (
              <button
                onClick={restoreDismissedActions}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <EyeOff className="w-3.5 h-3.5" /> Restore hidden
              </button>
            )}
            <button
              onClick={() => void loadActions()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0f766e 35%, #0369a1 100%)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-sm font-semibold">Today&apos;s priority queue</p>
              </div>
              <p className="text-sm text-white/80 max-w-2xl">
                The desk turns your invoices, cash position, GST exposure, and filing signals into ranked actions with exact next steps.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 min-w-[260px]">
                {[
                  { label: 'Open actions', value: mergedActions.length },
                  { label: 'High urgency', value: highUrgencyCount },
                  { label: 'Queued approvals', value: approvalTasks.filter((task) => task.status === 'queued').length },
                ].map((item) => (
                <div key={item.label} className="rounded-xl px-3 py-3 bg-white/10">
                  <p className="text-[11px] text-white/70">{item.label}</p>
                  <p className="text-lg font-bold mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Tabs
          variant="pill"
          activeTab={activeGroup}
          onChange={(value) => setActiveGroup(value as AgentActionGroup | 'all')}
          tabs={[
            { id: 'all', label: 'All', count: mergedActions.length },
            ...GROUPS.map((group) => ({ id: group, label: group, count: groupedActions.get(group)?.length ?? 0 })),
          ]}
        />

        {mergedActions.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>No urgent actions right now</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Your current data does not show high-signal follow-ups. Check back after new invoices, purchases, or payments land.
            </p>
            <Link href="/ai-copilot" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              Open AI Copilot
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {visibleGroups.map((group) => {
              const actions = groupedActions.get(group) ?? []
              if (actions.length === 0) return null
              return (
                <ActionDeskList
                  key={group}
                  group={group}
                  actions={actions}
                  onExplain={setSelectedAction}
                  onDismiss={(action) => {
                    dismissAction(action.id)
                  }}
                />
              )
            })}
          </div>
        )}
      </div>

      <ActionReasonDrawer action={selectedAction} open={!!selectedAction} onClose={() => setSelectedAction(null)} />
    </div>
  )
}
