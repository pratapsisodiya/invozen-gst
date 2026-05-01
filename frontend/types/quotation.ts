import type { LineItem, CustomerSnapshot, SupplyType } from './invoice'

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'

export interface Quotation {
  id: string
  quotationNumber: string
  status: QuotationStatus
  customerId: string
  customerSnapshot: CustomerSnapshot
  supplyType: SupplyType
  quotationDate: string
  validUntil: string
  lineItems: LineItem[]
  subtotal: number
  discountAmount: number
  taxableValue: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  totalTax: number
  grandTotal: number
  notes: string
  terms: string
  convertedToInvoiceId: string | null
  convertedToInvoiceNumber: string | null
  createdAt: string
  updatedAt: string
}
