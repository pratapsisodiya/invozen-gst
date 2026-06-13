'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw, Settings2, ShieldAlert, Sparkles } from 'lucide-react'
import { TopBar } from '@/app/components/app/TopBar'
import { Tabs } from '@/app/components/ui/Tabs'
import { buildCollectionsAutopilotPayload, runCollectionsAutopilot } from '@/lib/ai/autopilotClient'
import { useCollectionsAutopilotStore } from '@/lib/store/autopilotStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { useReminderHistoryStore } from '@/lib/store/reminderHistoryStore'
import { useUIStore } from '@/lib/store/uiStore'
import { openWhatsApp } from '@/lib/whatsapp/whatsappShare'
import { generateId } from '@/lib/utils/ids'
import { formatDate } from '@/lib/utils/formatters'
import type { ApprovalTask, CollectionsAutopilotSettings, ExecutionLog } from '@/types/autopilot'

type TabKey = 'queue' | 'exceptions' | 'history' | 'settings'

function createLocalLog(task: ApprovalTask, type: ExecutionLog['type'], message: string, detail?: string): ExecutionLog {
  return {
    id: generateId(),
    workflow: 'collections',
    runId: task.sourceRunId,
    type,
    entityId: task.id,
    entityType: 'approval_task',
    message,
    detail,
    createdAt: new Date().toISOString(),
  }
}

export function CollectionsAutopilotClient() {
  const invoices = useInvoiceStore((state) => state.invoices)
  const customers = useCustomerStore((state) => state.customers)
  const payments = usePaymentStore((state) => state.payments)
  const profile = useBusinessStore((state) => state.profile)
  const settings = useBusinessStore((state) => state.settings)
  const reminderHistoryAdd = useReminderHistoryStore((state) => state.addRecord)
  const queueSettings = useCollectionsAutopilotStore((state) => state.collectionsSettings)
  const approvalTasks = useCollectionsAutopilotStore((state) => state.approvalTasks)
  const runs = useCollectionsAutopilotStore((state) => state.runs)
  const logs = useCollectionsAutopilotStore((state) => state.logs)
  const syncEvaluation = useCollectionsAutopilotStore((state) => state.syncEvaluation)
  const updateTask = useCollectionsAutopilotStore((state) => state.updateTask)
  const appendLog = useCollectionsAutopilotStore((state) => state.appendLog)
  const setCollectionsSettings = useCollectionsAutopilotStore((state) => state.setCollectionsSettings)
  const addToast = useUIStore((state) => state.addToast)

  const [activeTab, setActiveTab] = useState<TabKey>('queue')
  const [running, setRunning] = useState(false)
  const [actingTaskId, setActingTaskId] = useState<string | null>(null)
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({})
  const [localSettings, setLocalSettings] = useState<CollectionsAutopilotSettings>(queueSettings)

  const queuedTasks = useMemo(() => approvalTasks.filter((task) => task.status === 'queued'), [approvalTasks])
  const escalatedTasks = useMemo(() => approvalTasks.filter((task) => task.status === 'escalated'), [approvalTasks])
  const lastRun = runs[0] ?? null

  useEffect(() => {
    setLocalSettings(queueSettings)
  }, [queueSettings])

  async function handleRun(triggeredBy: 'manual_refresh' | 'settings_change' = 'manual_refresh') {
    setRunning(true)
    try {
      const payload = buildCollectionsAutopilotPayload({
        invoices,
        customers,
        payments,
        profile,
        settings,
        triggeredBy,
      })
      const result = await runCollectionsAutopilot(payload)
      syncEvaluation(result)
      addToast({
        type: 'success',
        title: 'Collections autopilot updated',
        message: result.run.summary,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Autopilot run failed',
        message: 'Could not refresh the approval queue.',
      })
    } finally {
      setRunning(false)
    }
  }

  async function handleApprove(task: ApprovalTask, mode: 'approve' | 'edit') {
    setActingTaskId(task.id)
    try {
      const finalMessage = mode === 'edit' ? draftEdits[task.id] ?? task.draftMessage : task.draftMessage
      const response = await fetch(`/api/ai/autopilot/approvals/${task.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, finalMessage }),
      })
      if (!response.ok) throw new Error('Approval failed')

      const result = await response.json() as {
        task: ApprovalTask
        reminderRecord: ReturnType<typeof useReminderHistoryStore.getState>['history'][number] | null
        log: ExecutionLog
        messageToSend: string
      }

      updateTask(task.id, result.task)
      appendLog(result.log)

      if (task.customerPhone) {
        openWhatsApp(task.customerPhone, result.messageToSend)
        if (result.reminderRecord) reminderHistoryAdd(result.reminderRecord)
        addToast({
          type: 'success',
          title: 'Approval sent to WhatsApp',
          message: `${task.customerName} reminder is ready to send.`,
        })
      } else {
        await navigator.clipboard.writeText(result.messageToSend)
        addToast({
          type: 'info',
          title: 'Draft copied for manual handling',
          message: 'Customer phone is missing, so the message was copied instead.',
        })
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Approve failed',
        message: 'The reminder could not be completed.',
      })
    } finally {
      setActingTaskId(null)
    }
  }

  async function handleSnooze(task: ApprovalTask) {
    setActingTaskId(task.id)
    try {
      const snoozedUntil = new Date(Date.now() + (queueSettings.defaultSnoozeDays * 86400000)).toISOString()
      const response = await fetch(`/api/ai/autopilot/approvals/${task.id}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, snoozedUntil }),
      })
      if (!response.ok) throw new Error('Snooze failed')
      const result = await response.json() as { task: ApprovalTask; log: ExecutionLog }
      updateTask(task.id, result.task)
      appendLog(result.log)
      addToast({
        type: 'success',
        title: 'Task snoozed',
        message: `Will revisit ${task.invoiceNumber} after ${formatDate(snoozedUntil)}.`,
      })
    } catch {
      addToast({ type: 'error', title: 'Snooze failed' })
    } finally {
      setActingTaskId(null)
    }
  }

  async function handleDismiss(task: ApprovalTask) {
    setActingTaskId(task.id)
    try {
      const response = await fetch(`/api/ai/autopilot/approvals/${task.id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      })
      if (!response.ok) throw new Error('Dismiss failed')
      const result = await response.json() as { task: ApprovalTask; log: ExecutionLog }
      updateTask(task.id, result.task)
      appendLog(result.log)
      addToast({
        type: 'success',
        title: 'Recommendation dismissed',
        message: `${task.invoiceNumber} will not be re-queued immediately.`,
      })
    } catch {
      addToast({ type: 'error', title: 'Dismiss failed' })
    } finally {
      setActingTaskId(null)
    }
  }

  function handleEscalate(task: ApprovalTask) {
    updateTask(task.id, {
      status: 'escalated',
      resolutionNote: 'Escalated for manual handling by owner.',
    })
    appendLog(createLocalLog(task, 'task_escalated', `Escalated ${task.invoiceNumber} for manual handling.`))
    addToast({
      type: 'warning',
      title: 'Escalated for manual handling',
      message: `${task.invoiceNumber} moved out of the send queue.`,
    })
  }

  function handleSaveSettings() {
    setCollectionsSettings(localSettings)
    addToast({ type: 'success', title: 'Autopilot settings saved' })
    void handleRun('settings_change')
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Collections Autopilot"
        breadcrumb={[{ label: 'Action Desk', href: '/action-desk' }]}
        actions={
          <button
            onClick={() => void handleRun()}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            Run now
          </button>
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-5">
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 35%, #1d4ed8 100%)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-sm font-semibold">Guarded autopilot</p>
              </div>
              <p className="text-sm text-white/80">
                The collections agent monitors receivables, drafts the next reminder, and queues it for approval. It never sends automatically.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 min-w-[280px]">
              {[
                { label: 'Queued approvals', value: queuedTasks.length },
                { label: 'Escalations', value: escalatedTasks.length },
                { label: 'Last run', value: lastRun ? lastRun.metrics.invoicesConsidered : 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-xl px-3 py-3 bg-white/10">
                  <p className="text-[11px] text-white/70">{item.label}</p>
                  <p className="text-lg font-bold mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          {lastRun && (
            <p className="text-xs mt-4 text-white/75">
              Last run: {formatDate(lastRun.completedAt, 'dd MMM yyyy, hh:mm a')} - {lastRun.summary}
            </p>
          )}
        </div>

        <Tabs
          variant="pill"
          activeTab={activeTab}
          onChange={(value) => setActiveTab(value as TabKey)}
          tabs={[
            { id: 'queue', label: 'Approval Queue', count: queuedTasks.length },
            { id: 'exceptions', label: 'Exceptions', count: escalatedTasks.length },
            { id: 'history', label: 'History', count: logs.length },
            { id: 'settings', label: 'Settings' },
          ]}
        />

        {activeTab === 'queue' && (
          <div className="flex flex-col gap-3">
            {queuedTasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-10 h-10 text-ok-500" />}
                title="No approvals waiting"
                body="The queue is empty right now. Run the autopilot again after invoices or payments change."
              />
            ) : (
              queuedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  loading={actingTaskId === task.id}
                  draftValue={draftEdits[task.id] ?? task.draftMessage}
                  onDraftChange={(value) => setDraftEdits((current) => ({ ...current, [task.id]: value }))}
                  onApprove={() => void handleApprove(task, 'approve')}
                  onEditAndSend={() => void handleApprove(task, 'edit')}
                  onSnooze={() => void handleSnooze(task)}
                  onDismiss={() => void handleDismiss(task)}
                  onEscalate={() => handleEscalate(task)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'exceptions' && (
          <div className="flex flex-col gap-3">
            {escalatedTasks.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert className="w-10 h-10 text-brand-600" />}
                title="No escalations"
                body="High-risk and high-value cases will show up here for manual handling."
              />
            ) : (
              escalatedTasks.map((task) => (
                <div key={task.id} className="rounded-2xl bg-white p-5 flex flex-col gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{task.invoiceNumber} - {task.customerName}</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{task.reason}</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-err-100 text-err-700 font-semibold uppercase">
                      {task.escalationLevel.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-4 gap-2 text-xs">
                    <MiniStat label="Amount" value={`Rs.${Math.round(task.amount).toLocaleString('en-IN')}`} />
                    <MiniStat label="Risk score" value={`${task.paymentRiskScore}`} />
                    <MiniStat label="Prior reminders" value={`${task.priorReminderCount}`} />
                    <MiniStat label="Proposed send" value={formatDate(task.proposedSendAt, 'dd MMM, hh:mm a')} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/invoices/${task.invoiceId}`} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                      Open invoice
                    </Link>
                    <Link href={`/customers/${task.customerId}/statement`} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                      Customer statement
                    </Link>
                    <Link href="/payment-prediction" className="px-3 py-1.5 rounded-lg border text-sm hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                      Payment prediction
                    </Link>
                    <Link href="/reminders" className="px-3 py-1.5 rounded-lg border text-sm hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                      Reminders page
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            {logs.length === 0 ? (
              <div className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No execution history yet</div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {logs.slice(0, 60).map((log) => (
                  <div key={log.id} className="px-5 py-4 flex items-start gap-3">
                    <Clock3 className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{log.message}</p>
                      {log.detail && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{log.detail}</p>}
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>{formatDate(log.createdAt, 'dd MMM yyyy, hh:mm a')} - {log.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="rounded-2xl bg-white p-5 flex flex-col gap-5" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-brand-600" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Collections policy</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <SettingField label="Enable autopilot">
                <ToggleRow
                  enabled={localSettings.enabled}
                  onToggle={() => setLocalSettings((current) => ({ ...current, enabled: !current.enabled }))}
                  description="Queue approvals automatically on app load and refresh."
                />
              </SettingField>
              <SettingField label="WhatsApp only">
                <ToggleRow
                  enabled={localSettings.allowedChannels.includes('whatsapp')}
                  onToggle={() => setLocalSettings((current) => ({
                    ...current,
                    allowedChannels: current.allowedChannels.includes('whatsapp') ? [] : ['whatsapp'],
                  }))}
                  description="If no WhatsApp contact exists, the task is queued for channel choice."
                />
              </SettingField>
              <NumberField label="First reminder days before due" value={localSettings.firstReminderDaysBefore} onChange={(value) => setLocalSettings((current) => ({ ...current, firstReminderDaysBefore: value }))} />
              <NumberField label="Overdue follow-up after days" value={localSettings.overdueFollowupDays} onChange={(value) => setLocalSettings((current) => ({ ...current, overdueFollowupDays: value }))} />
              <NumberField label="Cooldown between reminders" value={localSettings.cooldownDays} onChange={(value) => setLocalSettings((current) => ({ ...current, cooldownDays: value }))} />
              <NumberField label="Max reminders per invoice" value={localSettings.maxRemindersPerInvoice} onChange={(value) => setLocalSettings((current) => ({ ...current, maxRemindersPerInvoice: value }))} />
              <NumberField label="High-value threshold" value={localSettings.highValueThreshold} onChange={(value) => setLocalSettings((current) => ({ ...current, highValueThreshold: value }))} />
              <NumberField label="Risk score escalation threshold" value={localSettings.riskScoreThreshold} onChange={(value) => setLocalSettings((current) => ({ ...current, riskScoreThreshold: value }))} />
              <TimeField label="Quiet hours start" value={localSettings.quietHoursStart} onChange={(value) => setLocalSettings((current) => ({ ...current, quietHoursStart: value }))} />
              <TimeField label="Quiet hours end" value={localSettings.quietHoursEnd} onChange={(value) => setLocalSettings((current) => ({ ...current, quietHoursEnd: value }))} />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
              >
                Save settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TaskCard(props: {
  task: ApprovalTask
  loading: boolean
  draftValue: string
  onDraftChange: (value: string) => void
  onApprove: () => void
  onEditAndSend: () => void
  onSnooze: () => void
  onDismiss: () => void
  onEscalate: () => void
}) {
  const { task, loading, draftValue, onDraftChange, onApprove, onEditAndSend, onSnooze, onDismiss, onEscalate } = props

  return (
    <div className="rounded-2xl bg-white p-5 flex flex-col gap-4" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{task.invoiceNumber} - {task.customerName}</p>
            <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold uppercase">
              queued approval
            </span>
            {task.customerPhone ? (
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold uppercase">whatsapp ready</span>
            ) : (
              <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold uppercase">channel choice</span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{task.reason}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs min-w-[220px]">
          <MiniStat label="Amount" value={`Rs.${Math.round(task.amount).toLocaleString('en-IN')}`} />
          <MiniStat label="Risk score" value={`${task.paymentRiskScore}`} />
          <MiniStat label="Prior reminders" value={`${task.priorReminderCount}`} />
          <MiniStat label="Send time" value={formatDate(task.proposedSendAt, 'dd MMM, hh:mm a')} />
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Draft message</p>
        <textarea
          value={draftValue}
          onChange={(event) => onDraftChange(event.target.value)}
          rows={6}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'white' }}
        />
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>{task.paymentRiskSummary}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link href={`/invoices/${task.invoiceId}`} className="px-3 py-2 rounded-lg border text-sm hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
          Open invoice
        </Link>
        <Link href={`/customers/${task.customerId}/statement`} className="px-3 py-2 rounded-lg border text-sm hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
          Statement
        </Link>
        <Link href="/reminders" className="px-3 py-2 rounded-lg border text-sm hover:bg-ink-50" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
          Reminders page
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <ActionButton disabled={loading} onClick={onApprove} primary>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Approve & Send
        </ActionButton>
        <ActionButton disabled={loading} onClick={onEditAndSend}>
          Edit & Send
        </ActionButton>
        <ActionButton disabled={loading} onClick={onSnooze}>
          Snooze
        </ActionButton>
        <ActionButton disabled={loading} onClick={onDismiss}>
          Dismiss
        </ActionButton>
        <ActionButton disabled={loading} onClick={onEscalate}>
          Escalate
        </ActionButton>
      </div>
    </div>
  )
}

function ActionButton({ children, disabled, onClick, primary = false }: { children: React.ReactNode; disabled?: boolean; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${primary ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'border hover:bg-ink-50'}`}
      style={primary ? undefined : { borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      <span className="inline-flex items-center gap-1.5">{children}</span>
    </button>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>{label}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  )
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white p-12 text-center" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{body}</p>
    </div>
  )
}

function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {children}
    </div>
  )
}

function ToggleRow({ enabled, onToggle, description }: { enabled: boolean; onToggle: () => void; description: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
      <p className="text-sm" style={{ color: 'var(--text)' }}>{description}</p>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${enabled ? 'bg-brand-600' : 'bg-ink-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-10 rounded-lg border px-3 text-sm outline-none"
        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
      />
    </label>
  )
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border px-3 text-sm outline-none"
        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
      />
    </label>
  )
}
