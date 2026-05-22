import type { Invoice } from '../../types/invoice'
import type { PurchaseInvoice } from '../../types/purchase'

export interface TaxProjection {
  outputGST: number
  itcAvailable: number
  netLiability: number
  daysUntilDue: number
  projectedMonthEnd: number
  safeToSpend: number
  runRate: {
    dailyOutputGST: number
    daysElapsed: number
    daysInMonth: number
  }
}

function roundTwo(n: number) {
  return Math.round(n * 100) / 100
}

export function computeTaxProjection(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  bankBalance: number,
  refDate: Date = new Date()
): TaxProjection {
  const month = refDate.getMonth() + 1
  const year = refDate.getFullYear()

  // Output GST: sum tax from non-void invoices in this month
  const monthInvoices = invoices.filter((inv) => {
    const d = new Date(inv.invoiceDate)
    return d.getMonth() + 1 === month && d.getFullYear() === year && inv.status !== 'void' && inv.status !== 'draft'
  })
  const outputGST = roundTwo(monthInvoices.reduce((s, i) => s + i.totalTax, 0))

  // ITC: eligible + claimed purchases this month
  const monthPurchases = purchases.filter((p) => {
    const d = new Date(p.invoiceDate)
    return d.getMonth() + 1 === month && d.getFullYear() === year &&
      (p.itcStatus === 'eligible' || p.itcStatus === 'claimed')
  })
  const itcAvailable = roundTwo(monthPurchases.reduce((s, p) => s + p.itcAvailable, 0))

  const netLiability = roundTwo(Math.max(0, outputGST - itcAvailable))

  // GSTR-3B due on 20th of next month
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const dueDate = new Date(nextYear, nextMonth - 1, 20)
  const daysUntilDue = Math.max(0, Math.ceil((dueDate.getTime() - refDate.getTime()) / 86400000))

  // Run rate projection
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysElapsed = Math.max(1, refDate.getDate())
  const dailyOutputGST = roundTwo(outputGST / daysElapsed)
  const projectedMonthEnd = roundTwo(Math.max(0, dailyOutputGST * daysInMonth - itcAvailable))

  const safeToSpend = roundTwo(bankBalance - netLiability)

  return {
    outputGST,
    itcAvailable,
    netLiability,
    daysUntilDue,
    projectedMonthEnd,
    safeToSpend,
    runRate: { dailyOutputGST, daysElapsed, daysInMonth },
  }
}
