export type ITCReversalReason =
  | 'personal_use'
  | 'exempt_supply'
  | 'input_destroyed'
  | 'non_payment_180_days'
  | 'rule_42_common_credit'
  | 'rule_43_capital_goods'
  | 'section_17_5_blocked'
  | 'voluntary'
  | 'other'

export const ITC_REVERSAL_REASON_LABELS: Record<ITCReversalReason, string> = {
  personal_use: 'Personal Use (Section 17(5))',
  exempt_supply: 'Used for Exempt Supply (Rule 42)',
  input_destroyed: 'Input Destroyed / Written Off',
  non_payment_180_days: 'Non-Payment to Vendor after 180 Days',
  rule_42_common_credit: 'Rule 42 — Common Credit Reversal',
  rule_43_capital_goods: 'Rule 43 — Capital Goods',
  section_17_5_blocked: 'Section 17(5) — Blocked Credit',
  voluntary: 'Voluntary Reversal',
  other: 'Other',
}

export interface ITCReversal {
  id: string
  reversalDate: string
  purchaseId: string | null
  purchaseInvoiceNumber: string | null
  vendorName: string
  vendorGstin: string | null
  originalInvoiceDate: string | null
  reason: ITCReversalReason
  reasonNotes: string
  cgstReversed: number
  sgstReversed: number
  igstReversed: number
  cessReversed: number
  totalReversed: number
  gstr3bPeriod: string | null
  isReported: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ITCReversalFilter {
  dateFrom: string | null
  dateTo: string | null
  reason: ITCReversalReason | 'all'
  search: string
}
