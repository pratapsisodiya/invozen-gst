import { buildCustomerPaymentProfiles, predictInvoicePayment } from '@/lib/reports/paymentPredictor'
import { generateReminderDraft } from '@/lib/ai/reminderDrafting'
import { generateId } from '@/lib/utils/ids'
import type {
  ApprovalTask,
  AutopilotEscalationLevel,
  AutopilotRule,
  AutopilotRun,
  CollectionsAutopilotEvaluationRequest,
  CollectionsAutopilotEvaluationResponse,
  CollectionsAutopilotSettings,
  CollectionsCandidate,
  CollectionsDecision,
  CollectionsDecisionType,
  ExecutionLog,
} from '@/types/autopilot'

const DAY_MS = 86400000

export const DEFAULT_COLLECTIONS_AUTOPILOT_SETTINGS: CollectionsAutopilotSettings = {
  enabled: true,
  allowedChannels: ['whatsapp'],
  firstReminderDaysBefore: 3,
  overdueFollowupDays: 3,
  overdueEscalationDays: 10,
  cooldownDays: 4,
  maxRemindersPerInvoice: 3,
  quietHoursStart: '21:00',
  quietHoursEnd: '09:00',
  highValueThreshold: 75000,
  riskScoreThreshold: 68,
  dismissCooldownDays: 3,
  defaultSnoozeDays: 2,
}

export function createCollectionsAutopilotRule(now = new Date().toISOString()): AutopilotRule {
  return {
    id: 'collections-autopilot-v1',
    workflow: 'collections',
    name: 'Collections guardrails',
    enabled: true,
    description: 'Monitors receivables, drafts reminders, and queues approvals without sending automatically.',
    updatedAt: now,
  }
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function daysBetween(targetDate: string, now: Date) {
  const target = startOfDay(new Date(targetDate))
  const reference = startOfDay(now)
  return Math.round((target.getTime() - reference.getTime()) / DAY_MS)
}

function isSameOrAfter(a: string | null | undefined, b: string) {
  if (!a) return false
  return new Date(a).getTime() >= new Date(b).getTime()
}

function addDays(iso: string, days: number) {
  const date = new Date(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map((part) => Number(part))
  return (hours * 60) + minutes
}

function getNextAllowedSendAt(now: Date, settings: CollectionsAutopilotSettings) {
  const startMinutes = parseTimeToMinutes(settings.quietHoursStart)
  const endMinutes = parseTimeToMinutes(settings.quietHoursEnd)
  const currentMinutes = (now.getHours() * 60) + now.getMinutes()
  const result = new Date(now)

  if (startMinutes > endMinutes) {
    if (currentMinutes >= startMinutes) {
      result.setDate(result.getDate() + 1)
      result.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
      return result.toISOString()
    }
    if (currentMinutes < endMinutes) {
      result.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
      return result.toISOString()
    }
  } else if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    result.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
    return result.toISOString()
  }

  return now.toISOString()
}

function getRiskSummary(prob30Days: number, daysOverdue: number, basis: string) {
  const overdue = daysOverdue > 0 ? `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue` : 'not overdue'
  return `${prob30Days}% chance of payment within 30 days, ${overdue}. ${basis}`
}

function buildTaskFingerprint(invoiceId: string, decisionType: Exclude<CollectionsDecisionType, 'skip'>) {
  return `collections:${invoiceId}:${decisionType}`
}

function createLog(runId: string, type: ExecutionLog['type'], entityId: string, entityType: ExecutionLog['entityType'], message: string, detail?: string, metadata?: ExecutionLog['metadata']): ExecutionLog {
  return {
    id: generateId(),
    workflow: 'collections',
    runId,
    type,
    entityId,
    entityType,
    message,
    detail,
    createdAt: new Date().toISOString(),
    metadata,
  }
}

function findRecentPayment(invoiceId: string, customerId: string, payments: CollectionsAutopilotEvaluationRequest['snapshot']['payments'], cutoffIso: string) {
  const relevant = payments
    .filter((payment) => payment.customerId === customerId && (payment.invoiceId === invoiceId || payment.invoiceId === null))
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))

  const recent = relevant.find((payment) => isSameOrAfter(payment.paymentDate, cutoffIso))
  return recent ?? null
}

function chooseChannel(hasWhatsApp: boolean, settings: CollectionsAutopilotSettings) {
  if (settings.allowedChannels.includes('whatsapp') && hasWhatsApp) return 'whatsapp' as const
  return 'owner_choice' as const
}

function buildCandidate(
  invoice: CollectionsAutopilotEvaluationRequest['snapshot']['invoices'][number],
  request: CollectionsAutopilotEvaluationRequest,
  now: Date,
  priorReminderCount: number,
  recentReminderAt: string | null,
  hasQueuedTask: boolean,
  riskScore: number,
  riskSummary: string,
) : CollectionsCandidate {
  const recentPayment = findRecentPayment(
    invoice.id,
    invoice.customerId,
    request.snapshot.payments,
    addDays(now.toISOString(), -request.settings.cooldownDays),
  )

  const customer = request.snapshot.customers.find((item) => item.id === invoice.customerId)
  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerSnapshot.name,
    customerPhone: customer?.phone ?? null,
    amount: invoice.balanceDue,
    dueDate: invoice.dueDate,
    daysUntilDue: daysBetween(invoice.dueDate, now),
    daysOverdue: Math.max(0, -daysBetween(invoice.dueDate, now)),
    priorReminderCount,
    recentReminderAt,
    recentPaymentAt: recentPayment?.paymentDate ?? null,
    recentPaymentAmount: recentPayment?.amount ?? 0,
    hasQueuedTask,
    proposedChannel: chooseChannel(Boolean(customer?.phone), request.settings),
    paymentRiskScore: riskScore,
    paymentRiskSummary: riskSummary,
  }
}

function getDecisionType(candidate: CollectionsCandidate, settings: CollectionsAutopilotSettings): Exclude<CollectionsDecisionType, 'skip'> | null {
  const isHighValue = candidate.amount >= settings.highValueThreshold
  const isHighRisk = candidate.paymentRiskScore >= settings.riskScoreThreshold

  if (candidate.daysOverdue >= settings.overdueEscalationDays && (isHighRisk || isHighValue)) {
    return 'escalate_high_risk_account'
  }

  if (candidate.daysOverdue > 0 && isHighValue) {
    return 'hold_manual_review'
  }

  if (candidate.daysOverdue >= settings.overdueFollowupDays) {
    return 'send_overdue_followup'
  }

  if (candidate.daysUntilDue === 0) {
    return 'send_due_today_reminder'
  }

  if (candidate.daysUntilDue > 0 && candidate.daysUntilDue <= settings.firstReminderDaysBefore && candidate.priorReminderCount === 0) {
    return 'send_first_reminder'
  }

  return null
}

function getEscalationLevel(decisionType: Exclude<CollectionsDecisionType, 'skip'>, candidate: CollectionsCandidate, settings: CollectionsAutopilotSettings): AutopilotEscalationLevel {
  if (decisionType === 'escalate_high_risk_account') return candidate.amount >= settings.highValueThreshold ? 'high_value' : 'high_risk'
  if (decisionType === 'hold_manual_review') return 'manual'
  if (candidate.paymentRiskScore >= settings.riskScoreThreshold) return 'watch'
  return 'none'
}

function getConfidence(score: number): CollectionsDecision['confidence'] {
  if (score >= 75) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

function getDecisionReason(candidate: CollectionsCandidate, decisionType: Exclude<CollectionsDecisionType, 'skip'>) {
  switch (decisionType) {
    case 'send_first_reminder':
      return `${candidate.invoiceNumber} is due in ${candidate.daysUntilDue} days and has not been reminded yet.`
    case 'send_due_today_reminder':
      return `${candidate.invoiceNumber} is due today with Rs.${Math.round(candidate.amount).toLocaleString('en-IN')} outstanding.`
    case 'send_overdue_followup':
      return `${candidate.invoiceNumber} is ${candidate.daysOverdue} days overdue and still within the approved reminder cadence.`
    case 'escalate_high_risk_account':
      return `${candidate.invoiceNumber} is overdue and crosses the configured risk or value threshold for manual escalation.`
    case 'hold_manual_review':
      return `${candidate.invoiceNumber} is a high-value receivable and should be reviewed before another outbound reminder.`
  }
}

export async function evaluateCollectionsAutopilot(request: CollectionsAutopilotEvaluationRequest): Promise<CollectionsAutopilotEvaluationResponse> {
  const now = request.now ? new Date(request.now) : new Date()
  const nowIso = now.toISOString()
  const runId = generateId()
  const rule = createCollectionsAutopilotRule(nowIso)
  const logs: ExecutionLog[] = [createLog(runId, 'run_started', runId, 'workflow', 'Collections autopilot run started.')]

  if (!request.settings.enabled) {
    const run: AutopilotRun = {
      id: runId,
      workflow: 'collections',
      status: 'completed',
      triggeredBy: request.triggeredBy ?? 'manual_refresh',
      startedAt: nowIso,
      completedAt: nowIso,
      summary: 'Collections autopilot is disabled.',
      metrics: {
        invoicesConsidered: 0,
        candidates: 0,
        queued: 0,
        skipped: 0,
        escalated: 0,
        manualReview: 0,
      },
      ruleIds: [rule.id],
      outputTaskIds: [],
      logIds: logs.map((log) => log.id),
    }

    return { rule, run, decisions: [], approvalTasks: [], logs }
  }

  const profiles = buildCustomerPaymentProfiles(request.snapshot.invoices, request.snapshot.payments)
  const profileMap = new Map(profiles.map((profile) => [profile.customerId, profile]))
  const reminderHistoryByInvoice = new Map<string, CollectionsAutopilotEvaluationRequest['reminderHistory']>()
  for (const record of request.reminderHistory) {
    const bucket = reminderHistoryByInvoice.get(record.invoiceId) ?? []
    bucket.push(record)
    reminderHistoryByInvoice.set(record.invoiceId, bucket)
  }

  const activeTasks = request.approvalTasks.filter((task) => ['queued', 'snoozed', 'escalated'].includes(task.status))
  const decisions: CollectionsDecision[] = []
  const tasks: ApprovalTask[] = []
  let skipped = 0
  let escalated = 0
  let manualReview = 0

  for (const invoice of request.snapshot.invoices) {
    if (['draft', 'void', 'paid'].includes(invoice.status) || invoice.balanceDue <= 0) {
      skipped += 1
      logs.push(createLog(runId, 'task_skipped', invoice.id, 'invoice', `Skipped ${invoice.invoiceNumber}.`, 'Invoice is not collectible in the current state.'))
      continue
    }

    const reminders = (reminderHistoryByInvoice.get(invoice.id) ?? []).sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    const priorReminderCount = reminders.length
    const recentReminderAt = reminders[0]?.sentAt ?? null
    const recentReminderCutoff = addDays(nowIso, -request.settings.cooldownDays)
    const matchingActiveTask = activeTasks.find((task) => task.invoiceId === invoice.id)

    const prediction = predictInvoicePayment(invoice, profileMap.get(invoice.customerId))
    const riskScore = Math.min(
      100,
      Math.max(
        0,
        (100 - prediction.prob30Days)
        + (prediction.daysOverdue * 2)
        + (priorReminderCount * 6)
        + (invoice.balanceDue >= request.settings.highValueThreshold ? 12 : 0),
      ),
    )
    const riskSummary = getRiskSummary(prediction.prob30Days, prediction.daysOverdue, prediction.basis)

    const candidate = buildCandidate(
      invoice,
      request,
      now,
      priorReminderCount,
      recentReminderAt,
      Boolean(matchingActiveTask?.status === 'queued'),
      riskScore,
      riskSummary,
    )

    if (candidate.recentPaymentAt) {
      skipped += 1
      logs.push(createLog(
        runId,
        'task_skipped',
        invoice.id,
        'invoice',
        `Suppressed ${invoice.invoiceNumber} after recent payment activity.`,
        `Recent payment of Rs.${Math.round(candidate.recentPaymentAmount).toLocaleString('en-IN')} landed on ${candidate.recentPaymentAt}.`,
      ))
      continue
    }

    if (candidate.hasQueuedTask) {
      skipped += 1
      logs.push(createLog(runId, 'task_skipped', invoice.id, 'invoice', `Skipped ${invoice.invoiceNumber} because an approval is already queued.`))
      continue
    }

    if (candidate.priorReminderCount >= request.settings.maxRemindersPerInvoice) {
      skipped += 1
      logs.push(createLog(runId, 'task_skipped', invoice.id, 'invoice', `Skipped ${invoice.invoiceNumber} because reminder cap is reached.`))
      continue
    }

    if (recentReminderAt && isSameOrAfter(recentReminderAt, recentReminderCutoff)) {
      skipped += 1
      logs.push(createLog(runId, 'task_skipped', invoice.id, 'invoice', `Skipped ${invoice.invoiceNumber} because cooldown is still active.`))
      continue
    }

    const snoozedTask = activeTasks.find((task) => task.invoiceId === invoice.id && task.status === 'snoozed' && task.snoozedUntil && new Date(task.snoozedUntil).getTime() > now.getTime())
    if (snoozedTask) {
      skipped += 1
      logs.push(createLog(runId, 'task_skipped', invoice.id, 'invoice', `Skipped ${invoice.invoiceNumber} because it is snoozed until ${snoozedTask.snoozedUntil}.`))
      continue
    }

    const dismissedTask = request.approvalTasks.find((task) =>
      task.invoiceId === invoice.id
      && task.status === 'dismissed'
      && new Date(task.updatedAt).getTime() >= new Date(addDays(nowIso, -request.settings.dismissCooldownDays)).getTime(),
    )
    if (dismissedTask) {
      skipped += 1
      logs.push(createLog(runId, 'task_skipped', invoice.id, 'invoice', `Skipped ${invoice.invoiceNumber} because the owner dismissed a recent recommendation.`))
      continue
    }

    const decisionType = getDecisionType(candidate, request.settings)
    if (!decisionType) {
      skipped += 1
      logs.push(createLog(runId, 'task_skipped', invoice.id, 'invoice', `Skipped ${invoice.invoiceNumber} because no reminder window is active.`))
      continue
    }

    const proposedSendAt = getNextAllowedSendAt(now, request.settings)
    const escalationLevel = getEscalationLevel(decisionType, candidate, request.settings)
    const reason = getDecisionReason(candidate, decisionType)
    const draft = await generateReminderDraft({
      customerName: candidate.customerName,
      invoiceNumber: candidate.invoiceNumber,
      amount: candidate.amount,
      dueDate: candidate.dueDate,
      daysOverdue: candidate.daysOverdue,
      previousReminders: candidate.priorReminderCount,
      businessName: request.snapshot.profile.businessName || 'Your business',
      decisionType,
      riskSummary: candidate.paymentRiskSummary,
    })

    if (draft.source === 'fallback') {
      logs.push(createLog(runId, 'ai_fallback', invoice.id, 'invoice', `Used fallback draft for ${invoice.invoiceNumber}.`))
    }

    const decision: CollectionsDecision = {
      id: generateId(),
      invoiceId: candidate.invoiceId,
      customerId: candidate.customerId,
      decisionType,
      reason,
      confidence: getConfidence(candidate.paymentRiskScore),
      escalationLevel,
      proposedSendAt,
      proposedChannel: candidate.proposedChannel,
      priorReminderCount: candidate.priorReminderCount,
      paymentRiskScore: candidate.paymentRiskScore,
      paymentRiskSummary: candidate.paymentRiskSummary,
      draftMessage: draft.message,
      sourceRunId: runId,
    }
    decisions.push(decision)

    const task: ApprovalTask = {
      id: generateId(),
      fingerprint: buildTaskFingerprint(candidate.invoiceId, decisionType),
      workflow: 'collections',
      status: decisionType === 'escalate_high_risk_account' || decisionType === 'hold_manual_review' ? 'escalated' : 'queued',
      invoiceId: candidate.invoiceId,
      invoiceNumber: candidate.invoiceNumber,
      customerId: candidate.customerId,
      customerName: candidate.customerName,
      customerPhone: candidate.customerPhone,
      amount: candidate.amount,
      proposedChannel: candidate.proposedChannel,
      proposedSendAt,
      draftMessage: draft.message,
      reason,
      confidence: decision.confidence,
      escalationLevel,
      priorReminderCount: candidate.priorReminderCount,
      paymentRiskScore: candidate.paymentRiskScore,
      paymentRiskSummary: candidate.paymentRiskSummary,
      sourceRunId: runId,
      decisionType,
      createdAt: nowIso,
      updatedAt: nowIso,
      resolutionNote: null,
      snoozedUntil: null,
    }
    tasks.push(task)

    if (task.status === 'queued') {
      logs.push(createLog(runId, 'task_queued', task.id, 'approval_task', `Queued approval for ${candidate.invoiceNumber}.`, reason, {
        amount: candidate.amount,
        riskScore: candidate.paymentRiskScore,
      }))
    } else {
      escalated += 1
      if (decisionType === 'hold_manual_review') manualReview += 1
      logs.push(createLog(runId, 'task_escalated', task.id, 'approval_task', `Escalated ${candidate.invoiceNumber} for owner review.`, reason, {
        amount: candidate.amount,
        riskScore: candidate.paymentRiskScore,
      }))
    }
  }

  const queued = tasks.filter((task) => task.status === 'queued').length
  const run: AutopilotRun = {
    id: runId,
    workflow: 'collections',
    status: skipped > 0 ? 'completed_with_skips' : 'completed',
    triggeredBy: request.triggeredBy ?? 'manual_refresh',
    startedAt: nowIso,
    completedAt: new Date().toISOString(),
    summary: `Reviewed ${request.snapshot.invoices.length} invoices, queued ${queued} approvals, and escalated ${escalated} cases.`,
    metrics: {
      invoicesConsidered: request.snapshot.invoices.length,
      candidates: decisions.length,
      queued,
      skipped,
      escalated,
      manualReview,
    },
    ruleIds: [rule.id],
    outputTaskIds: tasks.map((task) => task.id),
    logIds: logs.map((log) => log.id),
  }

  return {
    rule,
    run,
    decisions,
    approvalTasks: tasks,
    logs,
  }
}
