export type PaymentMethod = 'upi' | 'neft' | 'rtgs' | 'cash' | 'cheque' | 'card' | 'razorpay' | 'other'

export interface Payment {
  id: string
  invoiceId: string | null
  customerId: string
  amount: number
  paymentDate: string
  method: PaymentMethod
  reference: string | null
  notes: string | null
  isAdvance: boolean
  advanceAdjustedInvoiceId: string | null
  createdAt: string
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: 'UPI',
  neft: 'NEFT',
  rtgs: 'RTGS',
  cash: 'Cash',
  cheque: 'Cheque',
  card: 'Card',
  razorpay: 'Razorpay',
  other: 'Other',
}
