import type { Address } from './customer'

export type PurchaseStatus = 'draft' | 'recorded' | 'claimed' | 'rejected'
export type ItcStatus = 'eligible' | 'ineligible' | 'blocked' | 'claimed' | 'reversed'

export interface Vendor {
  id: string
  name: string
  businessName: string | null
  gstin: string | null
  gstinState: string | null
  gstinStateCode: string | null
  phone: string | null
  email: string | null
  address: Address
  totalPurchases: number
  totalItcClaimed: number
  notes: string | null
  createdAt: string
}

export interface PurchaseLineItem {
  id: string
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
  totalAmount: number
  itcEligible: boolean
}

export interface PurchaseInvoice {
  id: string
  vendorInvoiceNumber: string
  purchaseNumber: string
  status: PurchaseStatus
  vendorId: string
  vendorSnapshot: { name: string; gstin: string | null; state: string }
  supplyType: 'intra' | 'inter'
  invoiceDate: string
  lineItems: PurchaseLineItem[]
  subtotal: number
  taxableValue: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  totalTax: number
  grandTotal: number
  itcAvailable: number
  itcClaimed: number
  itcStatus: ItcStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseFilter {
  status: PurchaseStatus | 'all'
  vendorId: string | null
  dateFrom: string | null
  dateTo: string | null
  itcStatus: ItcStatus | 'all'
  search: string
}
