export interface OptimalPaymentEntry {
  purchaseId: string
  vendorName: string
  gstin: string | null
  invoiceDate: string
  amountDue: number
  itcAtStake: number
  daysUntil180: number
  urgencyScore: number
  urgencyTier: 'critical' | 'high' | 'medium' | 'low'
  reason: string
  canAfford: boolean
}
