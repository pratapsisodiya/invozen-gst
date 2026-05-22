import type { PurchaseInvoice } from '../../types/purchase'
import type { OptimalPaymentEntry } from '../../types/paymentOptimizer'
import type { VendorReliabilityScore } from './vendorReliability'

export function computeOptimalPaymentQueue(
  purchases: PurchaseInvoice[],
  reliabilityScores: VendorReliabilityScore[],
  availableCash: number
): OptimalPaymentEntry[] {
  const today = new Date()
  const reliabilityMap = new Map(reliabilityScores.map((s) => [s.vendorId, s]))

  const unpaid = purchases.filter(
    (p) => p.itcStatus === 'eligible' && p.status !== 'claimed'
  )

  const entries: OptimalPaymentEntry[] = unpaid.map((p) => {
    const invoiceDate = new Date(p.invoiceDate)
    const deadline180 = new Date(invoiceDate)
    deadline180.setDate(deadline180.getDate() + 180)
    const daysUntil180 = Math.max(0, Math.ceil((deadline180.getTime() - today.getTime()) / 86400000))

    const reliability = reliabilityMap.get(p.vendorId)

    let urgencyScore = 0
    const reasons: string[] = []

    if (daysUntil180 <= 7) {
      urgencyScore += 50
      reasons.push(`ITC reversal in ${daysUntil180}d`)
    } else if (daysUntil180 <= 30) {
      urgencyScore += 30
      reasons.push(`ITC reversal in ${daysUntil180}d`)
    } else if (daysUntil180 <= 60) {
      urgencyScore += 15
      reasons.push(`180-day rule: ${daysUntil180}d left`)
    }

    if (reliability?.reliabilityTier === 'risky') {
      urgencyScore += 20
      reasons.push('Risky vendor — pay before filing deadline')
    } else if (reliability?.reliabilityTier === 'caution') {
      urgencyScore += 10
      reasons.push('Vendor filing uncertain')
    }

    if (p.itcAvailable > 50000) {
      urgencyScore += 10
      reasons.push('High ITC value')
    } else if (p.itcAvailable > 10000) {
      urgencyScore += 5
    }

    urgencyScore = Math.min(100, urgencyScore)

    const urgencyTier: OptimalPaymentEntry['urgencyTier'] =
      urgencyScore >= 70 ? 'critical' : urgencyScore >= 40 ? 'high' : urgencyScore >= 20 ? 'medium' : 'low'

    return {
      purchaseId: p.id,
      vendorName: p.vendorSnapshot.name,
      gstin: p.vendorSnapshot.gstin,
      invoiceDate: p.invoiceDate,
      amountDue: p.grandTotal,
      itcAtStake: p.itcAvailable,
      daysUntil180,
      urgencyScore,
      urgencyTier,
      reason: reasons.length > 0 ? reasons.join('; ') : 'Normal priority',
      canAfford: false, // set below
    }
  })

  entries.sort((a, b) => b.urgencyScore - a.urgencyScore)

  let cumulative = 0
  for (const entry of entries) {
    cumulative += entry.amountDue
    entry.canAfford = cumulative <= availableCash
  }

  return entries
}
