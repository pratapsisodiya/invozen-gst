import { generateId } from '@/lib/utils/ids'
import type { ApprovalTask, ExecutionLog } from '@/types/autopilot'
import type { ReminderRecord } from '@/types/reminder'

function createLog(runId: string, type: ExecutionLog['type'], entityId: string, message: string, detail?: string): ExecutionLog {
  return {
    id: generateId(),
    workflow: 'collections',
    runId,
    type,
    entityId,
    entityType: 'approval_task',
    message,
    detail,
    createdAt: new Date().toISOString(),
  }
}

export interface ApprovalExecutionResult {
  task: ApprovalTask
  reminderRecord: ReminderRecord | null
  log: ExecutionLog
  messageToSend: string
}

export function approveCollectionsTask(task: ApprovalTask, finalMessage?: string): ApprovalExecutionResult {
  const messageToSend = finalMessage?.trim() || task.draftMessage
  const completedTask: ApprovalTask = {
    ...task,
    status: 'completed',
    draftMessage: messageToSend,
    updatedAt: new Date().toISOString(),
    resolutionNote: 'Approved and sent by owner.',
  }

  const reminderRecord: ReminderRecord | null = task.customerPhone ? {
    id: generateId(),
    invoiceId: task.invoiceId,
    invoiceNumber: task.invoiceNumber,
    customerId: task.customerId,
    customerName: task.customerName,
    phone: task.customerPhone,
    sentAt: completedTask.updatedAt,
    amount: task.amount,
    daysOverdue: 0,
    channel: task.proposedChannel === 'email' ? 'email' : 'whatsapp',
  } : null

  return {
    task: completedTask,
    reminderRecord,
    log: createLog(task.sourceRunId, 'task_completed', task.id, `Completed approval for ${task.invoiceNumber}.`),
    messageToSend,
  }
}

export function snoozeCollectionsTask(task: ApprovalTask, snoozedUntil: string): { task: ApprovalTask; log: ExecutionLog } {
  const updatedTask: ApprovalTask = {
    ...task,
    status: 'snoozed',
    snoozedUntil,
    updatedAt: new Date().toISOString(),
    resolutionNote: `Snoozed until ${snoozedUntil}.`,
  }

  return {
    task: updatedTask,
    log: createLog(task.sourceRunId, 'task_snoozed', task.id, `Snoozed ${task.invoiceNumber}.`, `Will re-evaluate after ${snoozedUntil}.`),
  }
}

export function dismissCollectionsTask(task: ApprovalTask): { task: ApprovalTask; log: ExecutionLog } {
  const updatedTask: ApprovalTask = {
    ...task,
    status: 'dismissed',
    updatedAt: new Date().toISOString(),
    resolutionNote: 'Dismissed by owner.',
  }

  return {
    task: updatedTask,
    log: createLog(task.sourceRunId, 'task_dismissed', task.id, `Dismissed ${task.invoiceNumber}.`),
  }
}
