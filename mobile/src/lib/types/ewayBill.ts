export type EWayBillStatus = 'draft' | 'active' | 'cancelled' | 'expired' | 'extended'
export type TransactionType = 'outward' | 'inward'
export type SubType = 'supply' | 'export' | 'job_work' | 'skd_ckd' | 'recipient_not_known' | 'for_own_use' | 'exhibition' | 'line_sales' | 'others'
export type TransportMode = 'road' | 'rail' | 'air' | 'ship'
export type VehicleType = 'regular' | 'over_dimensional'
export type DocType = 'tax_invoice' | 'bill_of_supply' | 'delivery_challan' | 'bill_of_entry' | 'credit_note' | 'debit_note' | 'others'

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
  
  // Product
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
  
  // Additional
  products?: EWayBillProduct[]
  
  createdAt: string
  updatedAt: string
}

export interface EWayBillFilter {
  status: EWayBillStatus | 'all'
  dateFrom: string | null
  dateTo: string | null
  search: string
}
