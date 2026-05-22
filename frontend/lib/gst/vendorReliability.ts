import type { Vendor, PurchaseInvoice } from '../../types/purchase'

export interface VendorReliabilityScore {
  vendorId: string
  vendorName: string
  gstin: string | null
  filingScore: number
  reliabilityTier: 'reliable' | 'caution' | 'risky' | 'unregistered'
  totalPurchases: number
  claimedCount: number
  reversedCount: number
  pendingITCAtRisk: number
}

export function computeVendorReliabilityScores(
  vendors: Vendor[],
  purchases: PurchaseInvoice[]
): VendorReliabilityScore[] {
  const results: VendorReliabilityScore[] = []

  for (const vendor of vendors) {
    const vendorPurchases = purchases.filter((p) => p.vendorId === vendor.id)
    if (vendorPurchases.length === 0) continue

    if (!vendor.gstin) {
      const pendingITCAtRisk = vendorPurchases
        .filter((p) => p.itcStatus === 'eligible')
        .reduce((s, p) => s + p.itcAvailable, 0)
      results.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        gstin: null,
        filingScore: 0,
        reliabilityTier: 'unregistered',
        totalPurchases: vendorPurchases.length,
        claimedCount: 0,
        reversedCount: 0,
        pendingITCAtRisk,
      })
      continue
    }

    const claimedCount = vendorPurchases.filter((p) => p.itcStatus === 'claimed').length
    const reversedCount = vendorPurchases.filter(
      (p) => p.itcStatus === 'reversed' || p.itcStatus === 'ineligible'
    ).length
    const total = vendorPurchases.length

    // Score based on claimed vs total (reversed = bad signal)
    const filingScore = total > 0 ? Math.round(((total - reversedCount) / total) * 100) : 100

    const reliabilityTier: VendorReliabilityScore['reliabilityTier'] =
      filingScore >= 90 ? 'reliable' : filingScore >= 70 ? 'caution' : 'risky'

    const pendingITCAtRisk =
      reliabilityTier === 'risky'
        ? vendorPurchases
            .filter((p) => p.itcStatus === 'eligible')
            .reduce((s, p) => s + p.itcAvailable, 0)
        : 0

    results.push({
      vendorId: vendor.id,
      vendorName: vendor.name,
      gstin: vendor.gstin,
      filingScore,
      reliabilityTier,
      totalPurchases: total,
      claimedCount,
      reversedCount,
      pendingITCAtRisk,
    })
  }

  return results.sort((a, b) => a.filingScore - b.filingScore)
}
