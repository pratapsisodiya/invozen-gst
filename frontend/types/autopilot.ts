import type { BusinessProfile, AppSettings } from '@/types/business'
import type { Customer } from '@/types/customer'
import type { Invoice } from '@/types/invoice'
import type { Payment } from '@/types/payment'
import type { ReminderRecord } from '@/types/reminder'

export type AutopilotWorkflow = 'collections'
export type AutopilotChannel = 'whatsapp' | 'email' | 'owner_choice'
export type AutopilotConfidence = 'high' | 'medium' | 'low'
export type AutopilotEscalationLevel = 'none' | 'watch' | 'high_value' | 'high_risk' | 'manual'
export type AutopilotRunTrigger = 'bootstrap' | 'manual_refresh' | 'settings_change'
export type AutopilotRunStatus = 'completed' | 'completed_with_skips' | 'failed'
export type ApprovalTaskStatus = 'queued' | 'completed' | 'snoozed' | 'dismissed' | 'escalated'
export type CollectionsDecisionType =
  | 'send_first_reminder'
  | 'send_due_today_reminder'
  | 'send_overdue_followup'
  | 'escalate_high_risk_account'
  | 'hold_manual_review'
  | 'skip'

export interface AutopilotRule {
  id: string
  workflow: AutopilotWorkflow
  name: string
  enabled: boolean
  description: string
  updatedAt: string
}

export interface AutopilotRunMetrics {
  invoicesConsidered: number
  candidates: number
  queued: number
  skipped: number
  escalated: number
  manualReview: number
}

export interface AutopilotRun {
  id: string
  workflow: AutopilotWorkflow
  status: AutopilotRunStatus
  triggeredBy: AutopilotRunTrigger
  startedAt: string
  completedAt: string
  summary: string
  metrics: AutopilotRunMetrics
  ruleIds: string[]
  outputTaskIds: string[]
  logIds: string[]
}

export interface CollectionsAutopilotSettings {
  enabled: boolean
  allowedChannels: AutopilotChannel[]
  firstReminderDaysBefore: number
  overdueFollowupDays: number
  overdueEscalationDays: number
  cooldownDays: number
  maxRemindersPerInvoice: number
  quietHoursStart: string
  quietHoursEnd: string
  highValueThreshold: number
  riskScoreThreshold: number
  dismissCooldownDays: number
  defaultSnoozeDays: number
}

export interface CollectionsCandidate {
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerPhone: string | null
  amount: number
  dueDate: string
  daysUntilDue: number
  daysOverdue: number
  priorReminderCount: number
  recentReminderAt: string | null
  recentPaymentAt: string | null
  recentPaymentAmount: number
  hasQueuedTask: boolean
  proposedChannel: AutopilotChannel
  paymentRiskScore: number
  paymentRiskSummary: string
}

export interface CollectionsDecision {
  id: string
  invoiceId: string
  customerId: string
  decisionType: CollectionsDecisionType
  reason: string
  confidence: AutopilotConfidence
  escalationLevel: AutopilotEscalationLevel
  proposedSendAt: string
  proposedChannel: AutopilotChannel
  priorReminderCount: number
  paymentRiskScore: number
  paymentRiskSummary: string
  draftMessage: string
  sourceRunId: string
}

export interface ApprovalTask {
  id: string
  fingerprint: string
  workflow: AutopilotWorkflow
  status: ApprovalTaskStatus
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerPhone: string | null
  amount: number
  proposedChannel: AutopilotChannel
  proposedSendAt: string
  draftMessage: string
  reason: string
  confidence: AutopilotConfidence
  escalationLevel: AutopilotEscalationLevel
  priorReminderCount: number
  paymentRiskScore: number
  paymentRiskSummary: string
  sourceRunId: string
  decisionType: Exclude<CollectionsDecisionType, 'skip'>
  createdAt: string
  updatedAt: string
  snoozedUntil?: string | null
  resolutionNote?: string | null
}

export type ExecutionLogType =
  | 'run_started'
  | 'task_queued'
  | 'task_skipped'
  | 'task_escalated'
  | 'task_approved'
  | 'task_completed'
  | 'task_snoozed'
  | 'task_dismissed'
  | 'ai_fallback'
  | 'run_failed'

export interface ExecutionLog {
  id: string
  workflow: AutopilotWorkflow
  runId: string
  type: ExecutionLogType
  entityId: string
  entityType: 'invoice' | 'approval_task' | 'workflow'
  message: string
  detail?: string
  createdAt: string
  metadata?: Record<string, string | number | boolean | null>
}

export interface CollectionsAutopilotSnapshot {
  invoices: Invoice[]
  customers: Customer[]
  payments: Payment[]
  profile: BusinessProfile
  settings: AppSettings
}

export interface CollectionsAutopilotEvaluationRequest {
  snapshot: CollectionsAutopilotSnapshot
  settings: CollectionsAutopilotSettings
  approvalTasks: ApprovalTask[]
  reminderHistory: ReminderRecord[]
  triggeredBy?: AutopilotRunTrigger
  now?: string
}

export interface CollectionsAutopilotEvaluationResponse {
  rule: AutopilotRule
  run: AutopilotRun
  decisions: CollectionsDecision[]
  approvalTasks: ApprovalTask[]
  logs: ExecutionLog[]
}
