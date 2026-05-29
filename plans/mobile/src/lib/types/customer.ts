export type CustomerType = 'b2b' | 'b2c' | 'export'

export interface Address {
  line1: string
  line2: string | null
  city: string
  state: string
  stateCode: string
  pincode: string
}

export interface Customer {
  id: string
  name: string
  businessName: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
  gstin: string | null
  gstinState: string | null
  gstinStateCode: string | null
  businessType: CustomerType
  billingAddress: Address
  shippingAddress: Address | null
  creditLimit: number | null
  paymentTermsDays: number
  totalInvoiced: number
  totalPaid: number
  notes: string | null
  tags: string[]
  createdAt: string
}
