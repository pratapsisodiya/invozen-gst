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

  const hsnMap = new Map<string, { description: string; uom: string; qty: number; taxableValue: number; gstRate: number; igst: number; cgst: number; sgst: number }>()

  for (const inv of filtered) {
    const isCreditNote = inv.invoiceType === 'credit_note'

    if (inv.customerSnapshot.gstin) {
      const entry: GSTR1B2BEntry = {
        customerGstin: inv.customerSnapshot.gstin,
        customerName: inv.customerSnapshot.name,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        invoiceType: isCreditNote ? 'Credit Note' : 'Regular',
        placeOfSupply: inv.placeOfSupply,
        reverseCharge: false,
        taxableValue: inv.taxableValue,
        igst: inv.igstTotal,
        cgst: inv.cgstTotal,
        sgst: inv.sgstTotal,
        cess: 0,
        invoiceId: inv.id,
      }
      if (isCreditNote) cdnr.push(entry)
      else b2b.push(entry)
    } else {
      const rate = inv.lineItems[0]?.gstRate ?? 18
      const key = `${inv.placeOfSupply}_${rate}_B2CS`
      const existing = b2cs.find(
        (x) => x.placeOfSupply === inv.placeOfSupply && x.applicableTaxRate === rate
      )
      if (existing) {
        existing.taxableValue += inv.taxableValue
        existing.igst += inv.igstTotal
      } else {
        b2cs.push({
          type: 'B2CS',
          placeOfSupply: inv.placeOfSupply,
          applicableTaxRate: rate,
          taxableValue: inv.taxableValue,
          igst: inv.igstTotal,
          cess: 0,
        })
      }
    }

    for (const item of inv.lineItems) {
      if (item.gstRate === 0) {
        nilRated += item.taxableValue
        continue
      }
      const hsnKey = item.hsnSac || 'MISC'
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
      totalTax: acc.totalTax + inv.totalTax,
    }),
    { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, totalTax: 0 }
  )

  return {
    period,
    b2b,
    b2cs,
    cdnr,
    nil: { nilRated, exempted, nonGst },
    hsn,
    totals,
  }
}
