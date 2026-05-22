export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
export type SupplyType = 'intra' | 'inter'
export type InvoiceType = 'tax_invoice' | 'proforma' | 'credit_note' | 'debit_note' | 'receipt_voucher' | 'bill_of_supply'

export interface LineItem {
  id: string
  itemId: string | null
  description: string
  hsnSac: string
  quantity: number
  unit: string
  rate: number
  discountPercent: number
  taxableValue: number
  gstRate: number
  cgst: number
  sgst: number
  igst: number
  cessRate: number
  cessAmount: number
  totalAmount: number
}

export interface CustomerSnapshot {
  name: string
  gstin: string | null
  address: string
  state: string
  stateCode: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  invoiceType: InvoiceType
  status: InvoiceStatus
  customerId: string
  customerSnapshot: CustomerSnapshot
  supplyType: SupplyType
  invoiceDate: string
  dueDate: string
  lineItems: LineItem[]
  subtotal: number
  discountAmount: number
  taxableValue: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  cessTotal: number
  totalTax: number
  grandTotal: number
  amountPaid: number
  balanceDue: number
  notes: string
  terms: string
  placeOfSupply: string
  irnNumber: string | null
  irnStatus: 'pending' | 'generated' | 'cancelled' | null
  irnAckNo?: string | null
  irnAckDate?: string | null
  irnQrCode?: string | null
  // TDS fields
  tdsSection: string | null
  tdsRate: number | null
  tdsAmount: number | null
  // Amendment fields
  amendedInvoiceId: string | null
  amendedInvoiceNumber: string | null
  amendmentReason: string | null
  // Multi-currency
  currency: string
  exchangeRate: number
  // Attachments
  attachmentIds: string[]
  createdAt: string
  updatedAt: string
}

export interface InvoiceFilter {
  status: InvoiceStatus | 'all'
  customerId: string | null
  dateFrom: string | null
  dateTo: string | null
  search: string
}
