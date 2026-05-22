import type { Invoice } from '@/types/invoice'
import type { PurchaseInvoice } from '@/types/purchase'
import type { Expense } from '@/types/expense'

export interface PLRow {
  label: string
  amount: number
  isSubtotal?: boolean
  isTotal?: boolean
  isNegative?: boolean
}

export interface PLStatement {
  period: string
  revenue: PLRow[]
  totalRevenue: number
  costOfGoods: PLRow[]
  totalCOGS: number
  grossProfit: number
  grossMarginPct: number
  expenses: PLRow[]
  totalExpenses: number
  ebitda: number
  netProfit: number
  netMarginPct: number
}

function r2(n: number) { return Math.round(n * 100) / 100 }

export function generatePLStatement(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  expenses: Expense[],
  month: number,
  year: number
): PLStatement {
  const filterMonth = (isoDate: string) => {
    const d = new Date(isoDate)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  }

  const monthInvoices = invoices.filter((inv) => filterMonth(inv.invoiceDate) && !['void', 'draft'].includes(inv.status))
  const monthPurchases = purchases.filter((p) => filterMonth(p.invoiceDate))
  const monthExpenses = expenses.filter((e) => filterMonth(e.date))

  const salesRevenue = r2(monthInvoices.reduce((s, i) => s + i.taxableValue, 0))
  const gstCollected = r2(monthInvoices.reduce((s, i) => s + i.totalTax, 0))
  const totalRevenue = r2(salesRevenue)

  const purchaseCost = r2(monthPurchases.reduce((s, p) => s + p.taxableValue, 0))
  const totalCOGS = purchaseCost

  const grossProfit = r2(totalRevenue - totalCOGS)
  const grossMarginPct = totalRevenue === 0 ? 0 : r2((grossProfit / totalRevenue) * 100)

  const expenseByCategory: Record<string, number> = {}
  for (const e of monthExpenses) {
    expenseByCategory[e.category] = r2((expenseByCategory[e.category] || 0) + e.amount)
  }
  const expenseRows: PLRow[] = Object.entries(expenseByCategory).map(([cat, amount]) => ({
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    amount,
  }))
  const totalExpenses = r2(Object.values(expenseByCategory).reduce((s, v) => s + v, 0))

  const ebitda = r2(grossProfit - totalExpenses)
  const netProfit = ebitda
  const netMarginPct = totalRevenue === 0 ? 0 : r2((netProfit / totalRevenue) * 100)

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return {
    period: `${MONTHS[month - 1]} ${year}`,
    revenue: [
      { label: 'Sales Revenue (Taxable)', amount: salesRevenue },
      { label: 'GST Collected (Liability)', amount: gstCollected, isNegative: true },
    ],
    totalRevenue,
    costOfGoods: [
      { label: 'Purchases (Material Cost)', amount: purchaseCost },
    ],
    totalCOGS,
    grossProfit,
    grossMarginPct,
    expenses: expenseRows,
    totalExpenses,
    ebitda,
    netProfit,
    netMarginPct,
  }
}
