import type { Invoice } from '../../types/invoice'
import type { Payment } from '../../types/payment'
import type { CustomerPaymentProfile, InvoicePaymentPrediction } from '../../types/paymentPrediction'

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildCustomerPaymentProfiles(
  invoices: Invoice[],
  payments: Payment[]
): CustomerPaymentProfile[] {
  const customerIds = [...new Set(invoices.map((i) => i.customerId))]
  const profiles: CustomerPaymentProfile[] = []

  for (const customerId of customerIds) {
    const customerInvoices = invoices.filter(
      (i) => i.customerId === customerId && i.status !== 'void' && i.status !== 'draft'
    )
    if (customerInvoices.length === 0) continue

    const customerName = customerInvoices[0].customerSnapshot.name
    const paidInvoices = customerInvoices.filter((i) => i.status === 'paid')

    const daysToPay: number[] = []
    for (const inv of paidInvoices) {
      const invDate = new Date(inv.invoiceDate)
      const invPayments = payments.filter((p) => p.invoiceId === inv.id)
      if (invPayments.length === 0) continue
      const latestPayment = invPayments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0]
      const payDate = new Date(latestPayment.paymentDate)
      const days = Math.max(0, Math.round((payDate.getTime() - invDate.getTime()) / 86400000))
      daysToPay.push(days)
    }

    const totalInvoices = customerInvoices.length
    const paidCount = paidInvoices.length
    const avgDaysToPay = daysToPay.length > 0 ? Math.round(daysToPay.reduce((s, d) => s + d, 0) / daysToPay.length) : 30
    const medianDaysToPay = Math.round(median(daysToPay))

    const paidWithin7Pct = daysToPay.length > 0 ? (daysToPay.filter((d) => d <= 7).length / daysToPay.length) * 100 : 0
    const paidWithin30Pct = daysToPay.length > 0 ? (daysToPay.filter((d) => d <= 30).length / daysToPay.length) * 100 : 0
    const paidWithin60Pct = daysToPay.length > 0 ? (daysToPay.filter((d) => d <= 60).length / daysToPay.length) * 100 : 0

    const latestPaid = paidInvoices.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))[0]
    const latestPaymentDate = latestPaid?.invoiceDate ?? null

    const confidence: CustomerPaymentProfile['confidence'] =
      paidCount >= 5 ? 'high' : paidCount >= 2 ? 'medium' : 'low'

    profiles.push({
      customerId,
      customerName,
      totalInvoices,
      paidInvoices: paidCount,
      avgDaysToPay,
      medianDaysToPay,
      paidWithin7Pct: Math.round(paidWithin7Pct),
      paidWithin30Pct: Math.round(paidWithin30Pct),
      paidWithin60Pct: Math.round(paidWithin60Pct),
      latestPaymentDate,
      confidence,
    })
  }

  return profiles
}

export function predictInvoicePayment(
  invoice: Invoice,
  profile: CustomerPaymentProfile | undefined
): InvoicePaymentPrediction {
  const today = new Date()
  const invoiceDate = new Date(invoice.invoiceDate)
  const daysOverdue = Math.max(0, Math.round((today.getTime() - new Date(invoice.dueDate).getTime()) / 86400000))

  if (!profile || profile.paidInvoices < 2) {
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerSnapshot.name,
      amount: invoice.balanceDue,
      daysOverdue,
      prob7Days: 20,
      prob30Days: 50,
      prob60Days: 75,
      expectedPaymentDate: addDays(today, 30),
      confidence: 'low',
      basis: 'Based on global average (insufficient history)',
    }
  }

  // Adjust probabilities based on current overdue status
  const overdueAdjust = daysOverdue > 30 ? 0.5 : daysOverdue > 7 ? 0.8 : 1.0

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerSnapshot.name,
    amount: invoice.balanceDue,
    daysOverdue,
    prob7Days: Math.round(profile.paidWithin7Pct * overdueAdjust),
    prob30Days: Math.round(profile.paidWithin30Pct * overdueAdjust),
    prob60Days: Math.round(profile.paidWithin60Pct * overdueAdjust),
    expectedPaymentDate: addDays(today, Math.round(profile.avgDaysToPay * (daysOverdue > 0 ? 1.3 : 1))),
    confidence: profile.confidence,
    basis: `Based on ${profile.paidInvoices} paid invoice${profile.paidInvoices > 1 ? 's' : ''} (avg ${profile.avgDaysToPay}d)`,
  }
}
