export type EWayBillStatus = 'draft' | 'active' | 'cancelled' | 'expired' | 'extended'
export type TransactionType = 'outward' | 'inward'
export type SubType = 'supply' | 'export' | 'job_work' | 'skd_ckd' | 'recipient_not_known' | 'for_own_use' | 'exhibition' | 'line_sales' | 'others'
export type TransportMode = 'road' | 'rail' | 'air' | 'ship'
export type VehicleType = 'regular' | 'over_dimensional'
export type DocType = 'tax_invoice' | 'bill_of_supply' | 'delivery_challan' | 'bill_of_entry' | 'credit_note' | 'debit_note' | 'others'

export const EWAY_BILL_STATUS_LABELS: Record<EWayBillStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  cancelled: 'Cancelled',
  expired: 'Expired',
  extended: 'Extended',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  outward: 'Outward Supply',
  inward: 'Inward Supply',
}

export const SUB_TYPE_LABELS: Record<SubType, string> = {
  supply: 'Supply',
  export: 'Export',
  job_work: 'Job Work',
  skd_ckd: 'SKD/CKD',
  recipient_not_known: 'Recipient Not Known',
  for_own_use: 'For Own Use',
  exhibition: 'Exhibition or Fairs',
  line_sales: 'Line Sales',
  others: 'Others',
}

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  road: 'Road',
  rail: 'Rail',
  air: 'Air',
  ship: 'Ship',
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  tax_invoice: 'Tax Invoice',
  bill_of_supply: 'Bill of Supply',
  delivery_challan: 'Delivery Challan',
  bill_of_entry: 'Bill of Entry',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  others: 'Others',
}

export interface TransporterInfo {
  id?: string
  name: string
  gstin?: string
}

export interface EWayBillPartB {
  vehicleNumber: string
  transportMode: TransportMode
  transportDocNo?: string
  transportDocDate?: string
  vehicleType: VehicleType
  transporter?: TransporterInfo
  updatedBy: string
  updatedDate: string
}

export interface EWayBillProduct {
  hsnCode: string
  productName: string
  productDesc?: string
  quantity: number
  unit: string
  cgstValue: number
  sgstValue: number
  igstValue: number
  cessValue: number
  cessNonAdvolValue: number
  otherValue: number
  totalValue: number
  taxableAmount: number
}

export interface EWayBill {
  id: string
  ewayBillNumber: string | null
  status: EWayBillStatus
  generationType: 'invoice' | 'challan' | 'manual'
  
  // References
  invoiceId: string | null
  challanId: string | null
  
  // Transaction
  transactionType: TransactionType
  subType: SubType
  docType: DocType
  docNumber: string
  docDate: string
  
  // Supplier
  fromGstin: string
  fromTradeName: string
  fromAddress: string
  fromPlace: string
  fromPincode: string
  fromStateCode: string
  
  // Recipient
  toGstin: string | null
  toTradeName: string
  toAddress: string
  toPlace: string
  toPincode: string
  toStateCode: string
  
  // Product (can have multiple in data.products array)
  hsnCode: string
  productName: string
  productDesc?: string
  quantity: number
  unit: string
  cgstValue: number
  sgstValue: number
  igstValue: number
  cessValue: number
  cessNonAdvolValue: number
  otherValue: number
  totalValue: number
  taxableAmount: number
  
  // Transportation
  transportMode: TransportMode
  transportDocNo: string | null
  transportDocDate: string | null
  vehicleNumber: string | null
  vehicleType: VehicleType | null
  transporter: TransporterInfo | null
  distance: number
  
  // Validity
  generatedDate: string | null
  validUpto: string | null
  extendedTimes: number
  
  // Part-B
  partBUpdated: boolean
  partBData: EWayBillPartB | null
  
  // Cancellation
  cancelledDate: string | null
  cancelReason: string | null
  cancelRemarks: string | null
  
  // Additional data (products array, etc.)
  products?: EWayBillProduct[]
  
  createdAt: string
  updatedAt: string
}

export interface ConsolidatedEWayBill {
  id: string
  consEwayBillNo: string | null
  generatedDate: string | null
  validUpto: string | null
  status: 'draft' | 'active' | 'cancelled'
  vehicleNumber: string
  transporterGstin: string | null
  transporterName: string | null
  fromPlace: string
  fromState: string
  ewayBillIds: string[]
  ewayBills?: EWayBill[]
  createdAt: string
  updatedAt: string
}

export interface EWayBillFilter {
  status: EWayBillStatus | 'all'
  dateFrom: string | null
  dateTo: string | null
  search: string
  expiringIn: number | null // days
}

export interface EWayBillValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface EWayBillStats {
  total: number
  active: number
  expired: number
  cancelled: number
  expiringToday: number
  expiringThisWeek: number
}

// Helper function to check if E-way bill is required
export function isEWayBillRequired(
  totalValue: number,
  supplyType: 'intra' | 'inter',
  stateCode?: string
): boolean {
  // E-way bill mandatory for inter-state supply > 50,000
  if (supplyType === 'inter' && totalValue > 50000) {
    return true
  }
  
  // For intra-state, check state-specific rules
  // Most states require E-way bill for > 50,000
  if (supplyType === 'intra' && totalValue > 50000) {
    // Add state-specific logic here if needed
    return true
  }
  
  return false
}

// Calculate validity based on distance
export function calculateValidity(distance: number, vehicleType: VehicleType = 'regular'): number {
  if (vehicleType === 'over_dimensional') {
    return Math.ceil(distance / 20) // 1 day per 20 km
  }
  return Math.ceil(distance / 100) // 1 day per 100 km
}

// Get status color for badges
export function getEWayBillStatusColor(status: EWayBillStatus): string {
  switch (status) {
    case 'draft':
      return 'gray'
    case 'active':
      return 'green'
    case 'extended':
      return 'blue'
    case 'expired':
      return 'red'
    case 'cancelled':
      return 'orange'
    default:
      return 'gray'
  }
}

// Check if E-way bill can be cancelled
export function canCancelEWayBill(ewayBill: EWayBill): boolean {
  if (ewayBill.status !== 'active' && ewayBill.status !== 'extended') {
    return false
  }
  
  if (!ewayBill.generatedDate) {
    return false
  }
  
  // Can cancel within 24 hours of generation
  const generatedTime = new Date(ewayBill.generatedDate).getTime()
  const now = new Date().getTime()
  const hoursSinceGeneration = (now - generatedTime) / (1000 * 60 * 60)
  
  return hoursSinceGeneration <= 24
}

// Check if E-way bill can be extended
export function canExtendEWayBill(ewayBill: EWayBill): boolean {
  if (ewayBill.status !== 'active' && ewayBill.status !== 'extended') {
    return false
  }
  
  // Maximum 4 extensions allowed
  if (ewayBill.extendedTimes >= 4) {
    return false
  }
  
  if (!ewayBill.validUpto) {
    return false
  }
  
  // Can extend before expiry
  const expiryTime = new Date(ewayBill.validUpto).getTime()
  const now = new Date().getTime()
  
  return now < expiryTime
}

// Check if E-way bill is expiring soon
export function isExpiringSoon(ewayBill: EWayBill, hoursThreshold: number = 24): boolean {
  if (!ewayBill.validUpto || ewayBill.status === 'expired' || ewayBill.status === 'cancelled') {
    return false
  }
  
  const expiryTime = new Date(ewayBill.validUpto).getTime()
  const now = new Date().getTime()
  const hoursUntilExpiry = (expiryTime - now) / (1000 * 60 * 60)
  
  return hoursUntilExpiry > 0 && hoursUntilExpiry <= hoursThreshold
}
