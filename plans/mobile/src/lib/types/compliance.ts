export type FilingType = 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' | 'GSTR-9C'
export type FilingFrequency = 'monthly' | 'quarterly' | 'annual'
export type FilingStatus = 'pending' | 'filed' | 'overdue' | 'not_applicable'

export interface ComplianceEvent {
  id: string
  type: FilingType
  period: string        // e.g. "Apr 2026"
  dueDate: string       // ISO date string
  status: FilingStatus
  filedDate?: string
}

export interface ComplianceSummary {
  nextDue: ComplianceEvent | null
  overdue: ComplianceEvent[]
  upcoming: ComplianceEvent[]
  allEvents: ComplianceEvent[]
}
