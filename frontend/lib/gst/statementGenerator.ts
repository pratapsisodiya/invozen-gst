import type { Invoice } from '@/types/invoice'
import type { Payment } from '@/types/payment'
import type { CreditNote } from '@/types/creditNote'

export interface StatementEntry {
  date: string
  type: 'invoice' | 'payment' | 'credit_note'
  reference: string
  description: string
  debit: number    // amount charged (invoice)
  credit: number   // amount paid (payment)
  balance: number  // running balance
}

export interface CustomerStatement {
  customerId: string
  customerName: string
  fromDate: string
  toDate: string
  openingBalance: number
  entries: StatementEntry[]
  closingBalance: number
  totalInvoiced: number
  totalPaid: number
}

export function generateCustomerStatement(
  customerId: string,
  customerName: string,
  invoices: Invoice[],
  payments: Payment[],
  fromDate: string,
  toDate: string,
  creditNotes: CreditNote[] = []
): CustomerStatement {
  // Build a timeline of all transactions
  type RawEntry = { date: string; type: 'invoice' | 'payment' | 'credit_note'; debit: number; credit: number; reference: string; description: string }
  const raw: RawEntry[] = []

  for (const inv of invoices) {
    if (inv.customerId !== customerId) continue
    if (inv.status === 'void') continue
    if (inv.invoiceDate < fromDate || inv.invoiceDate > toDate) continue
    raw.push({
      date: inv.invoiceDate,
      type: 'invoice',
      reference: inv.invoiceNumber,
      description: `Invoice ${inv.invoiceNumber}`,
      debit: inv.grandTotal,
      credit: 0,
    })
  }

  for (const pay of payments) {
    if (pay.customerId !== customerId) continue
    if (pay.paymentDate < fromDate || pay.paymentDate > toDate) continue
    raw.push({
      date: pay.paymentDate,
      type: 'payment',
      reference: pay.id,
      description: `Payment received${pay.method ? ` via ${pay.method}` : ''}`,
      debit: 0,
      credit: pay.amount,
    })
  }

  for (const cn of creditNotes) {
    if (cn.customerId !== customerId) continue
    if (cn.status === 'draft') continue
    if (cn.createdAt < fromDate || cn.createdAt > toDate) continue
    raw.push({
      date: cn.createdAt.split('T')[0],
      type: 'credit_note',
      reference: cn.creditNoteNumber,
      description: `Credit Note ${cn.creditNoteNumber}`,
      debit: 0,
      credit: cn.grandTotal,
    })
  }

  raw.sort((a, b) => a.date.localeCompare(b.date))

  let balance = 0
  const entries: StatementEntry[] = raw.map((r) => {
    balance += r.debit - r.credit
    return { ...r, balance }
  })

  const totalInvoiced = entries.filter((e) => e.type === 'invoice').reduce((s, e) => s + e.debit, 0)
  const totalPaid = entries.filter((e) => e.type === 'payment').reduce((s, e) => s + e.credit, 0)

  return {
    customerId,
    customerName,
    fromDate,
    toDate,
    openingBalance: 0,
    entries,
    closingBalance: balance,
    totalInvoiced,
    totalPaid,
  }
}
