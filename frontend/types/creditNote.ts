import type { LineItem, CustomerSnapshot } from './invoice'
import type { PurchaseLineItem } from './purchase'

export type CreditNoteStatus = 'draft' | 'approved' | 'adjusted'
export type CreditNoteReason = 'sales_return' | 'discount_allowed' | 'rate_difference' | 'other'
export type DebitNoteReason = 'purchase_return' | 'rate_difference' | 'additional_charges' | 'other'

export const CREDIT_NOTE_REASON_LABELS: Record<CreditNoteReason, string> = {
  sales_return: 'Sales Return',
  discount_allowed: 'Discount Allowed',
  rate_difference: 'Rate Difference',
  other: 'Other',
}

export const DEBIT_NOTE_REASON_LABELS: Record<DebitNoteReason, string> = {
  purchase_return: 'Purchase Return',
  rate_difference: 'Rate Difference',
  additional_charges: 'Additional Charges',
  other: 'Other',
}

export interface CreditNote {
  id: string
  creditNoteNumber: string
  status: CreditNoteStatus
  linkedInvoiceId: string
  linkedInvoiceNumber: string
  customerId: string
  customerSnapshot: CustomerSnapshot
  reason: CreditNoteReason
  lineItems: LineItem[]
  subtotal: number
  taxableValue: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  totalTax: number
  grandTotal: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface DebitNote {
  id: string
  debitNoteNumber: string
  status: CreditNoteStatus
  linkedPurchaseId: string | null
  linkedPurchaseNumber: string | null
  vendorId: string
  vendorSnapshot: { name: string; gstin: string | null; state: string }
  reason: DebitNoteReason
  lineItems: PurchaseLineItem[]
  subtotal: number
  taxableValue: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  totalTax: number
  grandTotal: number
  notes: string
  createdAt: string
  updatedAt: string
}
