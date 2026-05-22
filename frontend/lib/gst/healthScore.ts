import type { Invoice } from '@/types/invoice'
import type { PurchaseInvoice } from '@/types/purchase'
import type { FilingRecord } from '@/types/filing'

export interface HealthScoreBreakdown {
  filing: { score: number; max: number; label: string; status: 'good' | 'warn' | 'bad' }
  itcUtilization: { score: number; max: number; label: string; status: 'good' | 'warn' | 'bad' }
  gstinValidation: { score: number; max: number; label: string; status: 'good' | 'warn' | 'bad' }
  b2bCoverage: { score: number; max: number; label: string; status: 'good' | 'warn' | 'bad' }
  hsnCompliance: { score: number; max: number; label: string; status: 'good' | 'warn' | 'bad' }
}

export interface HealthScoreResult {
  overall: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  breakdown: HealthScoreBreakdown
  suggestions: string[]
}

function scoreStatus(score: number, max: number): 'good' | 'warn' | 'bad' {
  const pct = score / max
  if (pct >= 0.8) return 'good'
  if (pct >= 0.5) return 'warn'
  return 'bad'
}

export function calculateHealthScore(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  filings: FilingRecord[]
): HealthScoreResult {
  const recentInvoices = invoices.filter((inv) => {
    const d = new Date(inv.invoiceDate)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    return d >= sixMonthsAgo && inv.status !== 'void'
  })

  // 1. Filing compliance (25 pts)
  const requiredFilings = filings.length
  const onTimeFilings = filings.filter((f) => f.status === 'filed').length
  const filingScore = requiredFilings === 0 ? 20 : Math.round((onTimeFilings / requiredFilings) * 25)

  // 2. ITC utilization (20 pts)
  const totalAvailableItc = purchases
    .filter((p) => p.itcStatus === 'eligible' || p.itcStatus === 'claimed')
    .reduce((s, p) => s + p.itcAvailable, 0)
  const totalClaimedItc = purchases
    .filter((p) => p.itcStatus === 'claimed')
    .reduce((s, p) => s + p.itcClaimed, 0)
  const itcRate = totalAvailableItc === 0 ? 1 : totalClaimedItc / totalAvailableItc
  const itcScore = Math.round(itcRate * 20)

  // 3. GSTIN validation on B2B invoices (20 pts)
  const b2bInvoices = recentInvoices.filter((inv) => inv.customerSnapshot.gstin)
  const allBizInvoices = recentInvoices.filter((inv) => !inv.customerSnapshot.gstin
    ? false
    : true || inv.customerSnapshot.gstin)
  const gstinScore = allBizInvoices.length === 0 ? 20
    : Math.round((b2bInvoices.filter((inv) => /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/.test(inv.customerSnapshot.gstin!)).length / b2bInvoices.length) * 20)

  // 4. B2B invoice coverage (15 pts) — fraction of invoices that have customer GSTINs
  const b2bCoverageScore = recentInvoices.length === 0 ? 15
    : Math.round((b2bInvoices.length / recentInvoices.length) * 15)

  // 5. HSN compliance (20 pts) — fraction of B2B line items that have HSN/SAC codes
  let hsnTotal = 0
  let hsnFilled = 0
  for (const inv of recentInvoices) {
    if (!inv.customerSnapshot.gstin) continue
    for (const li of inv.lineItems) {
      hsnTotal++
      if (li.hsnSac && li.hsnSac.trim()) hsnFilled++
    }
  }
  const hsnScore = hsnTotal === 0 ? 20 : Math.round((hsnFilled / hsnTotal) * 20)

  const overall = Math.min(100, filingScore + itcScore + gstinScore + b2bCoverageScore + hsnScore)
  const grade: HealthScoreResult['grade'] = overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F'

  const suggestions: string[] = []
  if (filingScore < 20) suggestions.push('File overdue GST returns immediately to avoid penalties')
  if (itcScore < 15) suggestions.push('Claim eligible ITC on pending purchases to reduce tax liability')
  if (hsnScore < 15) suggestions.push('Add HSN/SAC codes to all B2B invoice line items (mandatory)')
  if (b2bCoverageScore < 10) suggestions.push('Collect GSTINs from business customers to claim ITC')
  if (gstinScore < 15) suggestions.push('Validate customer GSTINs before raising B2B tax invoices')

  return {
    overall,
    grade,
    breakdown: {
      filing: { score: filingScore, max: 25, label: 'Filing Compliance', status: scoreStatus(filingScore, 25) },
      itcUtilization: { score: itcScore, max: 20, label: 'ITC Utilization', status: scoreStatus(itcScore, 20) },
      gstinValidation: { score: gstinScore, max: 20, label: 'GSTIN Validation', status: scoreStatus(gstinScore, 20) },
      b2bCoverage: { score: b2bCoverageScore, max: 15, label: 'B2B Coverage', status: scoreStatus(b2bCoverageScore, 15) },
      hsnCompliance: { score: hsnScore, max: 20, label: 'HSN Compliance', status: scoreStatus(hsnScore, 20) },
    },
    suggestions,
  }
}
