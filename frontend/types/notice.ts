export type NoticeType =
  | 'demand_notice'
  | 'show_cause'
  | 'deficiency_memo'
  | 'audit_notice'
  | 'scrutiny'
  | 'other'

export type RiskLevel = 'low' | 'medium' | 'high'

export interface NoticeAIResult {
  noticeType: NoticeType
  keyDemands: string[]
  suggestedReply: string
  riskLevel: RiskLevel
  actionItems: string[]
  deadline: string | null
}

export interface Notice {
  id: string
  noticeText: string
  noticeType: NoticeType
  period: string
  aiResult: NoticeAIResult | null
  savedReply: string
  createdAt: string
}
