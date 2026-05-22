export interface CustomerPaymentProfile {
  customerId: string
  customerName: string
  totalInvoices: number
  paidInvoices: number
  avgDaysToPay: number
  medianDaysToPay: number
  paidWithin7Pct: number
  paidWithin30Pct: number
  paidWithin60Pct: number
  latestPaymentDate: string | null
  confidence: 'high' | 'medium' | 'low'
}

export interface InvoicePaymentPrediction {
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  amount: number
  daysOverdue: number
  prob7Days: number
  prob30Days: number
  prob60Days: number
  expectedPaymentDate: string
  confidence: 'high' | 'medium' | 'low'
  basis: string
}
