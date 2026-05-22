export interface CAClient {
  id: string
  businessName: string
  gstin: string
  state: string
  filingFrequency: 'monthly' | 'quarterly'
  contactName: string
  contactPhone: string
  contactEmail: string
  nextFilingDue: string | null
  lastFiledDate: string | null
  pendingInvoices: number
  outstandingAmount: number
  complianceScore: number
  status: 'active' | 'inactive'
  addedAt: string
}
