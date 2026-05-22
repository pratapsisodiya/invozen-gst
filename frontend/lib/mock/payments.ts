import type { Payment } from '../../types/payment'
import { mockInvoices } from './invoices'

const METHODS: Array<Payment['method']> = ['upi', 'upi', 'upi', 'upi', 'neft', 'neft', 'neft', 'cash', 'cash', 'cheque']

export const mockPayments: Payment[] = mockInvoices
  .filter((inv) => inv.status === 'paid' && inv.amountPaid > 0)
  .map((inv, i) => ({
    id: `pay-${String(i + 1).padStart(3, '0')}`,
    invoiceId: inv.id,
    customerId: inv.customerId,
    amount: inv.amountPaid,
    paymentDate: inv.invoiceDate,
    method: METHODS[i % METHODS.length],
    reference: METHODS[i % METHODS.length] === 'upi'
      ? `UPI${Math.random().toString(36).slice(2, 12).toUpperCase()}`
      : METHODS[i % METHODS.length] === 'neft'
      ? `NEFT${Math.random().toString(36).slice(2, 14).toUpperCase()}`
      : null,
    notes: null,
    isAdvance: false,
    advanceAdjustedInvoiceId: null,
    createdAt: `${inv.invoiceDate}T14:00:00Z`,
  }))
