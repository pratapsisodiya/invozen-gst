export type ChallanStatus = 'draft' | 'issued' | 'returned' | 'converted'

export type ChallanType = 'job_work' | 'supply_on_approval' | 'branch_transfer' | 'exhibition' | 'other'

export const CHALLAN_TYPE_LABELS: Record<ChallanType, string> = {
  job_work: 'Job Work (Section 143)',
  supply_on_approval: 'Supply on Approval / Sale or Return',
  branch_transfer: 'Supply to Branch / Agent',
  exhibition: 'Exhibition / Demo',
  other: 'Other',
}

export const CHALLAN_STATUS_LABELS: Record<ChallanStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  returned: 'Returned',
  converted: 'Converted to Invoice',
}

export interface ChallanLineItem {
  id: string
  itemId: string | null
  description: string
  hsnSac: string
  quantity: number
  unit: string
  rate: number
  totalValue: number
}

export interface DeliveryChallan {
  id: string
  challanNumber: string
  challanType: ChallanType
  status: ChallanStatus
  challanDate: string
  fromName: string
  fromGstin: string | null
  fromAddress: string
  fromState: string
  fromStateCode: string
  fromPincode: string
  customerId: string | null
  toName: string
  toGstin: string | null
  toAddress: string
  toState: string
  toStateCode: string
  toPincode: string
  lineItems: ChallanLineItem[]
  totalValue: number
  transporterName: string
  vehicleNumber: string
  transportMode: string
  distance: number | null
  ewayBillNumber: string | null
  expectedReturnDate: string | null
  actualReturnDate: string | null
  convertedToInvoiceId: string | null
  convertedToInvoiceNumber: string | null
  reasonForTransport: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ChallanFilter {
  status: ChallanStatus | 'all'
  challanType: ChallanType | 'all'
  dateFrom: string | null
  dateTo: string | null
  search: string
}
