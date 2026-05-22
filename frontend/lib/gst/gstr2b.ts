import type { PurchaseInvoice } from '@/types/purchase'

export interface GSTR2BEntry {
  supplierGstin: string
  supplierName: string
  invoiceNumber: string
  invoiceDate: string
  invoiceValue: number
  taxableValue: number
  igst: number
  cgst: number
  sgst: number
  itcAvailable: boolean
}

export interface GSTR2BReconciliationResult {
  matched: Array<{ purchase: PurchaseInvoice; gstr2b: GSTR2BEntry; igstDiff: number; cgstDiff: number; sgstDiff: number }>
  inBooksNotInGSTR2B: PurchaseInvoice[]
  inGSTR2BNotInBooks: GSTR2BEntry[]
}

export function reconcileGSTR2B(
  purchases: PurchaseInvoice[],
  gstr2bEntries: GSTR2BEntry[]
): GSTR2BReconciliationResult {
  const matched: GSTR2BReconciliationResult['matched'] = []
  const usedPurchaseIds = new Set<string>()
  const usedGSTR2BIndices = new Set<number>()

  for (const entry of gstr2bEntries) {
    let bestMatchIdx = -1
    let bestMatchPurchase: PurchaseInvoice | null = null

    // Try exact match on vendor GSTIN + invoice number
    for (let i = 0; i < purchases.length; i++) {
      const p = purchases[i]
      if (usedPurchaseIds.has(p.id)) continue
      if (
        p.vendorSnapshot.gstin === entry.supplierGstin &&
        p.vendorInvoiceNumber.toUpperCase() === entry.invoiceNumber.toUpperCase()
      ) {
        bestMatchIdx = i
        bestMatchPurchase = p
        break
      }
    }

    if (bestMatchPurchase && bestMatchIdx >= 0) {
      const idx = gstr2bEntries.indexOf(entry)
      usedPurchaseIds.add(bestMatchPurchase.id)
      usedGSTR2BIndices.add(idx)
      matched.push({
        purchase: bestMatchPurchase,
        gstr2b: entry,
        igstDiff: Math.round((bestMatchPurchase.igstTotal - entry.igst) * 100) / 100,
        cgstDiff: Math.round((bestMatchPurchase.cgstTotal - entry.cgst) * 100) / 100,
        sgstDiff: Math.round((bestMatchPurchase.sgstTotal - entry.sgst) * 100) / 100,
      })
    }
  }

  const inBooksNotInGSTR2B = purchases.filter((p) => !usedPurchaseIds.has(p.id))
  const inGSTR2BNotInBooks = gstr2bEntries.filter((_, i) => !usedGSTR2BIndices.has(i))

  return { matched, inBooksNotInGSTR2B, inGSTR2BNotInBooks }
}

export function parseGSTR2BJSON(jsonText: string): GSTR2BEntry[] {
  try {
    const data = JSON.parse(jsonText)
    const entries: GSTR2BEntry[] = []

    const b2bData = data?.data?.docdata?.b2b || data?.b2b || []
    for (const supplier of b2bData) {
      const gstin = supplier.ctin || supplier.supplierGstin || ''
      const name = supplier.trdnm || supplier.supplierName || gstin
      for (const inv of (supplier.inv || [])) {
        const igst = inv.itms?.[0]?.itm_det?.iamt ?? inv.igst ?? 0
        const cgst = inv.itms?.[0]?.itm_det?.camt ?? inv.cgst ?? 0
        const sgst = inv.itms?.[0]?.itm_det?.samt ?? inv.sgst ?? 0
        const taxable = inv.itms?.[0]?.itm_det?.txval ?? inv.taxableValue ?? 0
        entries.push({
          supplierGstin: gstin,
          supplierName: name,
          invoiceNumber: inv.inum || '',
          invoiceDate: inv.idt || '',
          invoiceValue: inv.val || 0,
          taxableValue: taxable,
          igst,
          cgst,
          sgst,
          itcAvailable: inv.itcavl !== 'N',
        })
      }
    }
    return entries
  } catch {
    return []
  }
}
