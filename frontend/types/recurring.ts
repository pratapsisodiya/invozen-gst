import type { LineItem, CustomerSnapshot } from './invoice'

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
export type RecurringStatus = 'active' | 'paused' | 'completed' | 'cancelled'

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
}

export interface RecurringTemplate {
  id: string
  name: string
  status: RecurringStatus
  customerId: string
  customerSnapshot: CustomerSnapshot
  frequency: RecurringFrequency
  customDays: number | null
  startDate: string
  endDate: string | null
  nextGenerationDate: string
  autoSend: boolean
  lineItems: LineItem[]
  notes: string
  terms: string
  totalGenerated: number
  lastGeneratedAt: string | null
  pausedReason: string | null
  createdAt: string
  updatedAt: string
}

export interface RecurringLog {
  id: string
  templateId: string
  invoiceId: string
  invoiceNumber: string
  generatedAt: string
  status: 'generated' | 'sent' | 'failed'
  triggeredBy: 'auto' | 'manual'
  error: string | null
}
