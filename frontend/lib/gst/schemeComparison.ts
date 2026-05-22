import type { Invoice } from '../../types/invoice'
import type { PurchaseInvoice } from '../../types/purchase'
import type { BusinessProfile } from '../../types/business'
import type { SchemeComparison } from '../../types/schemeComparison'

function roundTwo(n: number) {
  return Math.round(n * 100) / 100
}

function annualize(value: number, months: number): number {
  return months > 0 ? roundTwo((value / months) * 12) : 0
}

export function compareGSTSchemes(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  profile: BusinessProfile,
  dataMonths = 12
): SchemeComparison {
  const currentScheme: 'regular' | 'composition' = profile.gstRegistrationType === 'composition' ? 'composition' : 'regular'

  const validInvoices = invoices.filter((i) => i.status !== 'void' && i.status !== 'draft')

  const totalRevenue = validInvoices.reduce((s, i) => s + i.grandTotal, 0)
  const totalTaxableValue = validInvoices.reduce((s, i) => s + i.taxableValue, 0)
  const totalOutputGST = validInvoices.reduce((s, i) => s + i.totalTax, 0)

  const annualRevenue = annualize(totalRevenue, dataMonths)
  const annualTaxable = annualize(totalTaxableValue, dataMonths)
  const annualOutputGST = annualize(totalOutputGST, dataMonths)

  const claimedPurchases = purchases.filter((p) => p.itcStatus === 'claimed')
  const totalITCClaimed = claimedPurchases.reduce((s, p) => s + p.itcClaimed, 0)
  const annualITC = annualize(totalITCClaimed, dataMonths)

  const regularNetGST = roundTwo(Math.max(0, annualOutputGST - annualITC))

  // Eligibility checks
  const eligibilityBlockers: string[] = []

  if (annualRevenue > 15000000) {
    eligibilityBlockers.push('Annual turnover exceeds ₹1.5 crore (composition scheme limit)')
  }

  const hasInterState = validInvoices.some((i) => i.supplyType === 'inter')
  if (hasInterState) {
    eligibilityBlockers.push('Inter-state outward supplies are not allowed under composition scheme')
  }

  const b2bInvoices = validInvoices.filter((i) => i.customerSnapshot.gstin)
  const b2bRevenue = b2bInvoices.reduce((s, i) => s + i.grandTotal, 0)
  const b2bRatio = totalRevenue > 0 ? (b2bRevenue / totalRevenue) * 100 : 0

  if (b2bRatio > 60) {
    eligibilityBlockers.push(`${Math.round(b2bRatio)}% of sales are to GST-registered businesses (B2B customers cannot claim ITC from composition dealers)`)
  }

  const eligibleForComposition = eligibilityBlockers.length === 0

  // Composition rate: 1% for traders, 5% for restaurants, 6% for services
  const industry = profile.industry.toLowerCase()
  const compositionRate =
    industry.includes('restaurant') || industry.includes('food') ? 5
    : industry.includes('service') || industry.includes('professional') || industry.includes('consulting') ? 6
    : 1

  const compositionTax = roundTwo(annualTaxable * (compositionRate / 100))
  // ITC lost if switching to composition
  const itcLost = annualITC
  const compositionNetGST = compositionTax // no ITC under composition

  // B2B supply loss: if B2B customers lose ITC, they may prefer registered suppliers
  const b2bSupplyLoss = eligibleForComposition ? roundTwo(b2bRevenue * 0.05) : 0 // proxy: 5% risk to B2B revenue

  const savingsIfSwitch = roundTwo(regularNetGST - compositionNetGST)

  let recommendation: SchemeComparison['recommendation']
  let recommendationReason: string

  if (!eligibleForComposition) {
    recommendation = 'ineligible'
    recommendationReason = eligibilityBlockers[0]
  } else if (savingsIfSwitch > 20000) {
    recommendation = 'switch_composition'
    recommendationReason = `Switching saves ₹${savingsIfSwitch.toLocaleString('en-IN')}/year in net GST. Your ITC claims (₹${annualITC.toLocaleString('en-IN')}/yr) don't offset the composition advantage.`
  } else if (savingsIfSwitch < -10000) {
    recommendation = 'stay_regular'
    recommendationReason = `Staying regular saves ₹${Math.abs(savingsIfSwitch).toLocaleString('en-IN')}/year. Your ITC claims (₹${annualITC.toLocaleString('en-IN')}/yr) make the regular scheme more beneficial.`
  } else {
    recommendation = 'borderline'
    recommendationReason = `Both schemes are similar within ₹${Math.abs(savingsIfSwitch).toLocaleString('en-IN')}/year. Consider compliance burden and B2B customer requirements.`
  }

  return {
    currentScheme,
    annualizedRevenue: annualRevenue,
    eligibleForComposition,
    eligibilityBlockers,
    regularScheme: {
      outputGST: annualOutputGST,
      itcClaimed: annualITC,
      netGSTPaid: regularNetGST,
      annualFilings: 24, // 12 GSTR-1 + 12 GSTR-3B
    },
    compositionScheme: {
      compositionTax,
      compositionRate,
      itcLost,
      netGSTPaid: compositionNetGST,
      annualFilings: 5, // 4 quarterly CMP-08 + 1 annual GSTR-4
      b2bSupplyLoss,
    },
    savingsIfSwitch,
    recommendation,
    recommendationReason,
  }
}
