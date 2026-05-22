import type { Invoice } from '../../types/invoice'
import type { PurchaseInvoice } from '../../types/purchase'
import type { CustomerPaymentProfile } from '../../types/paymentPrediction'
import type { TaxProjection } from '../gst/taxLiabilityProjection'
import type { CashFlowForecast, CashFlowWeek } from '../../types/cashFlow'

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  r.setDate(r.getDate() - r.getDay())
  return r
}

function formatWeekLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export function buildCashFlowForecast(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  profiles: CustomerPaymentProfile[],
  taxProjection: TaxProjection,
  bankBalance: number,
  days = 90
): CashFlowForecast {
  const today = new Date()
  const profileMap = new Map(profiles.map((p) => [p.customerId, p]))

  // Build weekly buckets
  const weekMap = new Map<string, CashFlowWeek>()

  const getWeekKey = (d: Date) => isoDate(startOfWeek(d))

  for (let i = 0; i < days; i++) {
    const day = addDays(today, i)
    const wk = getWeekKey(day)
    if (!weekMap.has(wk)) {
      weekMap.set(wk, {
        weekLabel: formatWeekLabel(new Date(wk)),
        startDate: wk,
        expectedInflows: 0,
        scheduledOutflows: 0,
        gstPayments: 0,
        netCash: 0,
        closingBalance: 0,
        isGSTWeek: false,
      })
    }
  }

  // Expected inflows from outstanding invoices
  const outstanding = invoices.filter((i) => ['sent', 'overdue'].includes(i.status) && i.balanceDue > 0)
  for (const inv of outstanding) {
    const profile = profileMap.get(inv.customerId)
    const avgDays = profile ? profile.avgDaysToPay : 30
    const prob30 = profile ? profile.paidWithin30Pct / 100 : 0.5
    const expectedDate = addDays(today, avgDays)
    if (expectedDate > addDays(today, days)) continue
    const wk = getWeekKey(expectedDate)
    const w = weekMap.get(wk)
    if (w) w.expectedInflows += inv.balanceDue * prob30
  }

  // Scheduled vendor outflows (unpaid purchases)
  const unpaidPurchases = purchases.filter((p) => p.status !== 'claimed' && p.itcStatus === 'eligible')
  for (const p of unpaidPurchases) {
    const invoiceDate = new Date(p.invoiceDate)
    const expectedPayDate = addDays(invoiceDate, 45) // approximate payment within 45d
    if (expectedPayDate <= today || expectedPayDate > addDays(today, days)) continue
    const wk = getWeekKey(expectedPayDate)
    const w = weekMap.get(wk)
    if (w) w.scheduledOutflows += p.grandTotal
  }

  // GST payment on 20th of each month
  const netMonthlyGST = taxProjection.netLiability
  for (let m = 0; m <= 3; m++) {
    const gstDate = new Date(today.getFullYear(), today.getMonth() + m + 1, 20)
    if (gstDate > addDays(today, days)) break
    const wk = getWeekKey(gstDate)
    const w = weekMap.get(wk)
    if (w) {
      w.gstPayments += netMonthlyGST
      w.isGSTWeek = true
    }
  }

  // Compute running balance
  const weeks = Array.from(weekMap.values()).sort((a, b) => a.startDate.localeCompare(b.startDate))
  let running = bankBalance
  let lowestBalance = { date: isoDate(today), amount: bankBalance }
  const criticalDates: CashFlowForecast['criticalDates'] = []

  let totalInflows = 0
  let totalOutflows = 0
  let totalGST = 0

  for (const w of weeks) {
    running += w.expectedInflows - w.scheduledOutflows - w.gstPayments
    w.netCash = Math.round((w.expectedInflows - w.scheduledOutflows - w.gstPayments) * 100) / 100
    w.closingBalance = Math.round(running * 100) / 100
    totalInflows += w.expectedInflows
    totalOutflows += w.scheduledOutflows
    totalGST += w.gstPayments

    if (running < lowestBalance.amount) {
      lowestBalance = { date: w.startDate, amount: Math.round(running * 100) / 100 }
    }
    if (running < 0) {
      criticalDates.push({ date: w.startDate, type: 'low_cash', description: `Cash may drop to ₹${Math.round(running).toLocaleString('en-IN')}` })
    }
    if (w.isGSTWeek) {
      criticalDates.push({ date: w.startDate, type: 'gst_due', description: `GSTR-3B payment: ₹${netMonthlyGST.toLocaleString('en-IN')}` })
    }
  }

  const netSpendableToday = Math.round((bankBalance - taxProjection.netLiability) * 100) / 100

  return {
    weeks,
    netSpendableToday,
    lowestBalance,
    criticalDates,
    totalExpectedInflows: Math.round(totalInflows * 100) / 100,
    totalScheduledOutflows: Math.round(totalOutflows * 100) / 100,
    totalGSTPeriod: Math.round(totalGST * 100) / 100,
  }
}
