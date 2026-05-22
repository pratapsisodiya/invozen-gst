import type { Invoice } from '../../types/invoice'
import type { GSTR1Summary, GSTR1B2BEntry, GSTR1B2CSummary } from '../../types/gst'

export function calculateGSTR1Summary(
  invoices: Invoice[],
  period: { month: number; year: number }
): GSTR1Summary {
  const filtered = invoices.filter((inv) => {
    if (inv.status === 'void' || inv.status === 'draft') return false
    const d = new Date(inv.invoiceDate)
    return d.getMonth() + 1 === period.month && d.getFullYear() === period.year
  })

  const b2b: GSTR1B2BEntry[] = []
  const b2cs: GSTR1B2CSummary[] = []
  const cdnr: GSTR1B2BEntry[] = []
  let nilRated = 0
  let exempted = 0
  let nonGst = 0
  let missingHsnCount = 0
  let skippedEmptyLineItems = 0

  const hsnMap = new Map<string, { description: string; uom: string; qty: number; taxableValue: number; gstRate: number; igst: number; cgst: number; sgst: number }>()

  for (const inv of filtered) {
    const isCreditNote = inv.invoiceType === 'credit_note'

    // Skip invoices with no line items — can't determine rate or HSN
    if (!inv.lineItems.length) { skippedEmptyLineItems++; continue }

    if (inv.customerSnapshot.gstin?.trim()) {
      const isAmended = !!inv.amendedInvoiceId
      const entry: GSTR1B2BEntry = {
        customerGstin: inv.customerSnapshot.gstin,
        customerName: inv.customerSnapshot.name,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        invoiceType: isCreditNote ? 'Credit Note' : isAmended ? 'Amended' : 'Regular',
        placeOfSupply: inv.placeOfSupply,
        reverseCharge: false,
        taxableValue: inv.taxableValue,
        igst: inv.igstTotal,
        cgst: inv.cgstTotal,
        sgst: inv.sgstTotal,
        cess: inv.cessTotal ?? 0,
        invoiceId: inv.id,
      }
      if (isCreditNote) cdnr.push(entry)
      else b2b.push(entry)
    } else {
      // Aggregate B2CS per line item so mixed-rate invoices land in the correct rate bucket
      for (const li of inv.lineItems) {
        if (li.taxableValue === 0) continue
        const existing = b2cs.find(
          (x) => x.placeOfSupply === inv.placeOfSupply && x.applicableTaxRate === li.gstRate
        )
        const liIgst = inv.supplyType === 'inter' ? li.igst : 0
        if (existing) {
          existing.taxableValue += li.taxableValue
          existing.igst += liIgst
        } else {
          b2cs.push({
            type: 'B2CS',
            placeOfSupply: inv.placeOfSupply,
            applicableTaxRate: li.gstRate,
            taxableValue: li.taxableValue,
            igst: liIgst,
            cess: 0,
          })
        }
      }
    }

    for (const item of inv.lineItems) {
      if (item.gstRate === 0) {
        // Distinguish nil-rated (HSN present, explicitly 0%) from exempted (no HSN = outside GST scope)
        if (item.hsnSac && item.hsnSac.trim()) {
          nilRated += item.taxableValue
        } else {
          exempted += item.taxableValue
        }
        continue
      }
      if (!item.hsnSac?.trim()) { missingHsnCount++; continue }
      const hsnKey = item.hsnSac
      const existing = hsnMap.get(hsnKey)
      if (existing) {
        existing.qty += item.quantity
        existing.taxableValue += item.taxableValue
        existing.igst += item.igst
        existing.cgst += item.cgst
        existing.sgst += item.sgst
      } else {
        hsnMap.set(hsnKey, {
          description: item.description,
          uom: item.unit,
          qty: item.quantity,
          taxableValue: item.taxableValue,
          gstRate: item.gstRate,
          igst: item.igst,
          cgst: item.cgst,
          sgst: item.sgst,
        })
      }
    }
  }

  const hsn = Array.from(hsnMap.entries()).map(([code, data]) => ({
    hsnCode: code,
    description: data.description,
    uom: data.uom,
    totalQuantity: data.qty,
    taxableValue: data.taxableValue,
    gstRate: data.gstRate,
    igst: data.igst,
    cgst: data.cgst,
    sgst: data.sgst,
  }))

  const totals = filtered.reduce(
    (acc, inv) => ({
      taxableValue: acc.taxableValue + inv.taxableValue,
      igst: acc.igst + inv.igstTotal,
      cgst: acc.cgst + inv.cgstTotal,
      sgst: acc.sgst + inv.sgstTotal,
      cess: acc.cess + (inv.cessTotal ?? 0),
      totalTax: acc.totalTax + inv.totalTax,
    }),
    { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, totalTax: 0 }
  )

  return {
    period,
    b2b,
    b2cs,
    cdnr,
    nil: { nilRated, exempted, nonGst },
    hsn,
    totals,
    missingHsnCount,
    skippedEmptyLineItems,
  }
}
