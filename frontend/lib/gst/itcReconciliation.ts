import type { PurchaseInvoice } from '@/types/purchase'

export interface ITCMonthSummary {
  month: number
  year: number
  label: string       // "Apr 2026"
  igst: number
  cgst: number
  sgst: number
  total: number
  purchaseCount: number
  eligibleCount: number
  claimedCount: number
  ineligibleCount: number
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function reconcileITCByMonth(purchases: PurchaseInvoice[], months = 6): ITCMonthSummary[] {
  const now = new Date()
  const result: ITCMonthSummary[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()

    const monthPurchases = purchases.filter((p) => {
      const pd = new Date(p.invoiceDate)
      return pd.getMonth() + 1 === month && pd.getFullYear() === year
    })

    let igst = 0, cgst = 0, sgst = 0
    let eligibleCount = 0, claimedCount = 0, ineligibleCount = 0

    for (const p of monthPurchases) {
      if (p.itcStatus === 'eligible') eligibleCount++
      else if (p.itcStatus === 'claimed') claimedCount++
      else if (p.itcStatus === 'ineligible' || p.itcStatus === 'blocked') ineligibleCount++

      if (p.itcStatus === 'eligible' || p.itcStatus === 'claimed') {
        for (const item of p.lineItems) {
          if (!item.itcEligible) continue
          igst += item.igst
          cgst += item.cgst
          sgst += item.sgst
        }
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100
    result.push({
      month,
      year,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      igst: round2(igst),
      cgst: round2(cgst),
      sgst: round2(sgst),
      total: round2(igst + cgst + sgst),
      purchaseCount: monthPurchases.length,
      eligibleCount,
      claimedCount,
      ineligibleCount,
    })
  }

  return result
}
