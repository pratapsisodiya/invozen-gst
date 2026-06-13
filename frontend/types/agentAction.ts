export type AgentActionType =
  | 'overdue_followup'
  | 'payment_risk'
  | 'itc_claim'
  | 'gst_anomaly'
  | 'rcm_review'
  | 'cash_warning'
  | 'filing_task'
  | 'vendor_risk'
  | 'manual_task'

export type AgentActionUrgency = 'high' | 'medium' | 'low'
export type AgentActionConfidence = 'high' | 'medium' | 'low'

export type AgentActionGroup =
  | 'Collect Money'
  | 'Save GST / Claim ITC'
  | 'Fix Compliance Risks'
  | 'Prepare Filing'
  | 'Protect Cash'

export interface AgentAction {
  id: string
  type: AgentActionType
  group: AgentActionGroup
  title: string
  summary: string
  urgency: AgentActionUrgency
  confidence: AgentActionConfidence
  impactLabel: string
  impactValue?: number
  reason: string
  targetHref?: string
  entityId?: string
  primaryActionLabel: string
  secondaryActionLabel?: string
  source?: 'system' | 'copilot' | 'autopilot'
  statusLabel?: 'Insight' | 'Queued Approval' | 'Autopilot' | 'Exception'
}

export interface AgentActionResponse {
  actions: AgentAction[]
  generatedAt: string
  source: 'deterministic' | 'ai_enriched'
}
