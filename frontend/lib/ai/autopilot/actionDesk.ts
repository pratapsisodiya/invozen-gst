import type { AgentAction } from '@/types/agentAction'
import type { ApprovalTask } from '@/types/autopilot'

function getUrgency(task: ApprovalTask): AgentAction['urgency'] {
  if (task.escalationLevel !== 'none' || task.paymentRiskScore >= 75) return 'high'
  if (task.paymentRiskScore >= 45) return 'medium'
  return 'low'
}

function getTitle(task: ApprovalTask) {
  if (task.status === 'escalated') return `Manual review: ${task.invoiceNumber}`
  return `Approve reminder: ${task.invoiceNumber}`
}

function getPrimaryActionLabel(task: ApprovalTask) {
  if (task.status === 'escalated') return 'Review autopilot'
  return 'Open approval queue'
}

function getStatusLabel(task: ApprovalTask): AgentAction['statusLabel'] {
  if (task.status === 'queued') return 'Queued Approval'
  if (task.status === 'escalated') return 'Exception'
  return 'Autopilot'
}

export function mapApprovalTaskToAgentAction(task: ApprovalTask): AgentAction {
  return {
    id: `autopilot-${task.id}`,
    type: 'overdue_followup',
    group: 'Collect Money',
    title: getTitle(task),
    summary: task.reason,
    urgency: getUrgency(task),
    confidence: task.confidence,
    impactLabel: task.status === 'escalated' ? 'Needs review' : 'Awaiting approval',
    impactValue: task.amount,
    reason: `${task.paymentRiskSummary} Proposed channel: ${task.proposedChannel}. Prior reminders: ${task.priorReminderCount}.`,
    targetHref: '/collections-autopilot',
    entityId: task.invoiceId,
    primaryActionLabel: getPrimaryActionLabel(task),
    secondaryActionLabel: 'Why queued?',
    source: 'autopilot',
    statusLabel: getStatusLabel(task),
  }
}
