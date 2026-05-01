import type { Address } from './customer'

export type GSTRegistrationType = 'regular' | 'composition' | 'unregistered'
export type FilingFrequency = 'monthly' | 'quarterly'
export type InvoiceTemplate = 'standard' | 'compact' | 'detailed'

export interface BusinessProfile {
  businessName: string
  legalName: string
  businessType: string
  industry: string
  gstin: string
  gstRegistrationType: GSTRegistrationType
  stateCode: string
  state: string
  filingFrequency: FilingFrequency
  panNumber: string
  tanNumber: string | null
  phone: string
  email: string
  billingAddress: Address
  logoUrl: string | null
  signatureUrl: string | null
}

export interface InvoiceSettings {
  invoicePrefix: string
  invoiceStartNumber: number
  currentCounter: number
  duePeriodDays: number
  defaultTemplate: InvoiceTemplate
  footerNote: string
  termsAndConditions: string
  showBankDetails: boolean
  showUpiQr: boolean
}

export interface BankDetails {
  bankName: string
  accountName: string
  accountNumber: string
  ifscCode: string
  upiId: string
}

export interface AppSettings {
  invoiceSettings: InvoiceSettings
  bankDetails: BankDetails
  whatsappNumber: string
  defaultGstRate: number
  razorpayConnected: boolean
}
