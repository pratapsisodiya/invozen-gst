import type { Invoice } from '@/types/invoice'
import type { PurchaseInvoice } from '@/types/purchase'

export interface GSTR9Table4 {
  b2bTaxable: number
  b2cTaxable: number
  exportsTaxable: number
  nilRated: number
  exempted: number
  totalOutward: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
}

export interface GSTR9Table6 {
  itcOnB2B: { igst: number; cgst: number; sgst: number }
  itcReversed: { igst: number; cgst: number; sgst: number }
  netItc: { igst: number; cgst: number; sgst: number }
}

export interface GSTR9Table9 {
  outputIgst: number
  outputCgst: number
  outputSgst: number
  itcIgst: number
  itcCgst: number
  itcSgst: number
  netPayableIgst: number
  netPayableCgst: number
  netPayableSgst: number
  totalNetPayable: number
}

export interface GSTR9Summary {
  financialYear: string
  table4: GSTR9Table4
  table6: GSTR9Table6
  table9: GSTR9Table9
  turnover: number
}

function isFY(isoDate: string, fyYear: number): boolean {
  const d = new Date(isoDate)
  const m = d.getMonth() + 1
  const y = d.getFullYear()
  // FY runs April to March; fyYear = year starting (e.g., 2024 means April 2024 - March 2025)
  if (m >= 4) return y === fyYear
  return y === fyYear + 1
}

const r2 = (n: number) => Math.round(n * 100) / 100

export function calculateGSTR9Summary(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  fyYear: number
): GSTR9Summary {
  const fyInvoices = invoices.filter((inv) => inv.status !== 'void' && inv.status !== 'draft' && isFY(inv.invoiceDate, fyYear))
  const fyPurchases = purchases.filter((p) => isFY(p.invoiceDate, fyYear))

  let b2bTaxable = 0
  let b2cTaxable = 0
  let nilRated = 0
  let exempted = 0
  let cgstTotal = 0
  let sgstTotal = 0
  let igstTotal = 0

  for (const inv of fyInvoices) {
    if (inv.customerSnapshot.gstin) {
      b2bTaxable += inv.taxableValue
    } else {
      b2cTaxable += inv.taxableValue
    }
    for (const li of inv.lineItems) {
      if (li.gstRate === 0) {
        if (li.hsnSac) nilRated += li.taxableValue
        else exempted += li.taxableValue
      }
    }
    cgstTotal += inv.cgstTotal
    sgstTotal += inv.sgstTotal
    igstTotal += inv.igstTotal
  }

  let itcIgst = 0
  let itcCgst = 0
  let itcSgst = 0
  let itcRevIgst = 0
  let itcRevCgst = 0
  let itcRevSgst = 0

  for (const p of fyPurchases) {
    if (p.itcStatus === 'eligible' || p.itcStatus === 'claimed') {
      for (const li of p.lineItems) {
        if (!li.itcEligible) continue
        itcIgst += li.igst
        itcCgst += li.cgst
        itcSgst += li.sgst
      }
    }
    if (p.itcStatus === 'reversed') {
      for (const li of p.lineItems) {
        itcRevIgst += li.igst
        itcRevCgst += li.cgst
        itcRevSgst += li.sgst
      }
    }
  }

  const netItcIgst = r2(itcIgst - itcRevIgst)
  const netItcCgst = r2(itcCgst - itcRevCgst)
  const netItcSgst = r2(itcSgst - itcRevSgst)

  const netIgst = r2(Math.max(0, igstTotal - netItcIgst))
  const netCgst = r2(Math.max(0, cgstTotal - netItcCgst))
  const netSgst = r2(Math.max(0, sgstTotal - netItcSgst))

  return {
    financialYear: `${fyYear}-${String(fyYear + 1).slice(-2)}`,
    table4: {
      b2bTaxable: r2(b2bTaxable),
      b2cTaxable: r2(b2cTaxable),
      exportsTaxable: 0,
      nilRated: r2(nilRated),
      exempted: r2(exempted),
      totalOutward: r2(b2bTaxable + b2cTaxable),
      totalCgst: r2(cgstTotal),
      totalSgst: r2(sgstTotal),
      totalIgst: r2(igstTotal),
    },
    table6: {
      itcOnB2B: { igst: r2(itcIgst), cgst: r2(itcCgst), sgst: r2(itcSgst) },
      itcReversed: { igst: r2(itcRevIgst), cgst: r2(itcRevCgst), sgst: r2(itcRevSgst) },
      netItc: { igst: netItcIgst, cgst: netItcCgst, sgst: netItcSgst },
    },
    table9: {
      outputIgst: r2(igstTotal),
      outputCgst: r2(cgstTotal),
      outputSgst: r2(sgstTotal),
      itcIgst: netItcIgst,
      itcCgst: netItcCgst,
      itcSgst: netItcSgst,
      netPayableIgst: netIgst,
      netPayableCgst: netCgst,
      netPayableSgst: netSgst,
      totalNetPayable: r2(netIgst + netCgst + netSgst),
    },
    turnover: r2(b2bTaxable + b2cTaxable + igstTotal + cgstTotal + sgstTotal),
  }
}
