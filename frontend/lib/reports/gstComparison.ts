import type { Invoice } from '@/types/invoice'
import type { PurchaseInvoice } from '@/types/purchase'
import type { Expense } from '@/types/expense'

export type ComparisonMode = 'monthly' | 'quarterly'

export interface PeriodData {
  label: string
  periodKey: string
  month: number
  year: number
  quarter?: number
  outputTax: number
  itcClaimed: number
  netPayable: number
  revenue: number
  taxableValue: number
  invoiceCount: number
  purchaseCount: number
}

export interface PeriodVariance {
  periodLabel: string
  prevPeriodLabel: string | null
  outputTaxChange: number
  outputTaxChangePct: number | null
  itcChange: number
  itcChangePct: number | null
  netPayableChange: number
  netPayableChangePct: number | null
  flagged: boolean
}

export interface PeriodComparison {
  periods: PeriodData[]
  variance: PeriodVariance[]
  summary: {
    avgOutputTax: number
    avgItcClaimed: number
    avgNetPayable: number
    avgRevenue: number
    peakPeriod: string
    lowestPeriod: string
    itcUtilizationPct: number
  }
}

function periodKey(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function quarterLabel(quarter: number, year: number): string {
  return `Q${quarter} FY${year}`
}

function monthLabel(month: number, year: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[month - 1]} ${year}`
}

export function generateGSTComparison(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  expenses: Expense[],
  periodCount: number,
  mode: ComparisonMode
): PeriodComparison {
  const now = new Date()
  const periods: PeriodData[] = []

  // Build period list going back periodCount periods from now
  const periodList: Array<{ month: number; year: number; quarter?: number }> = []

  if (mode === 'monthly') {
    for (let i = periodCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      periodList.push({ month: d.getMonth() + 1, year: d.getFullYear() })
    }
  } else {
    // Quarterly — go back periodCount quarters
    const currentQuarter = Math.floor((now.getMonth()) / 3) + 1
    for (let i = periodCount - 1; i >= 0; i--) {
      let q = currentQuarter - i
      let y = now.getFullYear()
      while (q <= 0) { q += 4; y -= 1 }
      periodList.push({ month: (q - 1) * 3 + 1, year: y, quarter: q })
    }
  }

  for (const p of periodList) {
    const { month, year, quarter } = p

    // Get invoices for this period (or quarter)
    const periodInvoices = invoices.filter((inv) => {
      if (inv.status === 'void' || inv.status === 'draft') return false
      const d = new Date(inv.invoiceDate)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      if (mode === 'monthly') return m === month && y === year
      // Quarterly: months in range
      const qStart = (Math.floor((month - 1) / 3)) * 3 + 1
      return y === year && m >= qStart && m <= qStart + 2
    })

    const periodPurchases = purchases.filter((pur) => {
      if (pur.status === 'draft') return false
      const d = new Date(pur.invoiceDate)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      if (mode === 'monthly') return m === month && y === year
      const qStart = (Math.floor((month - 1) / 3)) * 3 + 1
      return y === year && m >= qStart && m <= qStart + 2
    })

    const periodExpenses = expenses.filter((e) => {
      if (!e.isItcEligible || !e.isGstRegistered) return false
      const d = new Date(e.date)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      if (mode === 'monthly') return m === month && y === year
      const qStart = (Math.floor((month - 1) / 3)) * 3 + 1
      return y === year && m >= qStart && m <= qStart + 2
    })

    const outputTax = Math.round(periodInvoices.reduce((s, inv) => s + inv.cgstTotal + inv.sgstTotal + inv.igstTotal, 0) * 100) / 100
    const revenue = Math.round(periodInvoices.reduce((s, inv) => s + inv.grandTotal, 0) * 100) / 100
    const taxableValue = Math.round(periodInvoices.reduce((s, inv) => s + inv.taxableValue, 0) * 100) / 100

    let itcClaimed = 0
    for (const pur of periodPurchases) {
      if (pur.itcStatus !== 'eligible' && pur.itcStatus !== 'claimed') continue
      for (const item of pur.lineItems) {
        if (!item.itcEligible) continue
        itcClaimed += item.cgst + item.sgst + item.igst
      }
    }
    for (const exp of periodExpenses) {
      itcClaimed += exp.gstAmount
    }
    itcClaimed = Math.round(itcClaimed * 100) / 100

    const netPayable = Math.max(0, Math.round((outputTax - itcClaimed) * 100) / 100)

    periods.push({
      label: mode === 'quarterly' && quarter ? quarterLabel(quarter, year) : monthLabel(month, year),
      periodKey: periodKey(month, year),
      month,
      year,
      quarter,
      outputTax,
      itcClaimed,
      netPayable,
      revenue,
      taxableValue,
      invoiceCount: periodInvoices.length,
      purchaseCount: periodPurchases.length,
    })
  }

  // Compute variance
  const variance: PeriodVariance[] = periods.map((p, i) => {
    if (i === 0) {
      return {
        periodLabel: p.label,
        prevPeriodLabel: null,
        outputTaxChange: 0,
        outputTaxChangePct: null,
        itcChange: 0,
        itcChangePct: null,
        netPayableChange: 0,
        netPayableChangePct: null,
        flagged: false,
      }
    }
    const prev = periods[i - 1]
    const outputTaxChange = p.outputTax - prev.outputTax
    const outputTaxChangePct = prev.outputTax > 0 ? Math.round((outputTaxChange / prev.outputTax) * 10000) / 100 : null
    const itcChange = p.itcClaimed - prev.itcClaimed
    const itcChangePct = prev.itcClaimed > 0 ? Math.round((itcChange / prev.itcClaimed) * 10000) / 100 : null
    const netPayableChange = p.netPayable - prev.netPayable
    const netPayableChangePct = prev.netPayable > 0 ? Math.round((netPayableChange / prev.netPayable) * 10000) / 100 : null
    const flagged = netPayableChangePct !== null && Math.abs(netPayableChangePct) > 10

    return {
      periodLabel: p.label,
      prevPeriodLabel: prev.label,
      outputTaxChange: Math.round(outputTaxChange * 100) / 100,
      outputTaxChangePct,
      itcChange: Math.round(itcChange * 100) / 100,
      itcChangePct,
      netPayableChange: Math.round(netPayableChange * 100) / 100,
      netPayableChangePct,
      flagged,
    }
  })

  // Summary
  const n = periods.length || 1
  const avgOutputTax = Math.round(periods.reduce((s, p) => s + p.outputTax, 0) / n * 100) / 100
  const avgItcClaimed = Math.round(periods.reduce((s, p) => s + p.itcClaimed, 0) / n * 100) / 100
  const avgNetPayable = Math.round(periods.reduce((s, p) => s + p.netPayable, 0) / n * 100) / 100
  const avgRevenue = Math.round(periods.reduce((s, p) => s + p.revenue, 0) / n * 100) / 100
  const peakPeriod = periods.reduce((a, b) => a.outputTax > b.outputTax ? a : b, periods[0])?.label ?? '-'
  const lowestPeriod = periods.filter((p) => p.outputTax > 0).reduce((a, b) => a.outputTax < b.outputTax ? a : b, periods[0])?.label ?? '-'
  const totalOutput = periods.reduce((s, p) => s + p.outputTax, 0)
  const totalItc = periods.reduce((s, p) => s + p.itcClaimed, 0)
  const itcUtilizationPct = totalOutput > 0 ? Math.round((totalItc / totalOutput) * 10000) / 100 : 0

  return {
    periods,
    variance,
    summary: { avgOutputTax, avgItcClaimed, avgNetPayable, avgRevenue, peakPeriod, lowestPeriod, itcUtilizationPct },
  }
}
