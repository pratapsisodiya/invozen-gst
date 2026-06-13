'use client'

import type { ApprovalTask, CollectionsAutopilotEvaluationRequest, CollectionsAutopilotEvaluationResponse } from '@/types/autopilot'
import type { ReminderRecord } from '@/types/reminder'
import type { BusinessProfile, AppSettings } from '@/types/business'
import type { Customer } from '@/types/customer'
import type { Invoice } from '@/types/invoice'
import type { Payment } from '@/types/payment'
import { useCollectionsAutopilotStore } from '@/lib/store/autopilotStore'
import { useReminderHistoryStore } from '@/lib/store/reminderHistoryStore'

export function buildCollectionsAutopilotPayload(input: {
  invoices: Invoice[]
  customers: Customer[]
  payments: Payment[]
  profile: BusinessProfile
  settings: AppSettings
  approvalTasks?: ApprovalTask[]
  reminderHistory?: ReminderRecord[]
  triggeredBy?: CollectionsAutopilotEvaluationRequest['triggeredBy']
}): CollectionsAutopilotEvaluationRequest {
  const autopilotState = useCollectionsAutopilotStore.getState()
  const reminderState = useReminderHistoryStore.getState()

  return {
    snapshot: {
      invoices: input.invoices,
      customers: input.customers,
      payments: input.payments,
      profile: input.profile,
      settings: input.settings,
    },
    settings: autopilotState.collectionsSettings,
    approvalTasks: input.approvalTasks ?? autopilotState.approvalTasks,
    reminderHistory: input.reminderHistory ?? reminderState.history,
    triggeredBy: input.triggeredBy,
  }
}

export async function runCollectionsAutopilot(payload: CollectionsAutopilotEvaluationRequest): Promise<CollectionsAutopilotEvaluationResponse> {
  const response = await fetch('/api/ai/autopilot/collections/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Collections autopilot evaluation failed')
  }

  return response.json() as Promise<CollectionsAutopilotEvaluationResponse>
}
