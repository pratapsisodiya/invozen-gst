import type { Invoice } from '../../types/invoice'
import type { PurchaseInvoice } from '../../types/purchase'
import type { Expense } from '../../types/expense'
import type { GSTR3BSummary } from '../../types/gst'
import type { ITCReversal } from '../../types/itcReversal'

export function calculateGSTR3BSummary(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  period: { month: number; year: number },
  expenses: Expense[] = [],
  itcReversals: ITCReversal[] = []
): GSTR3BSummary {
  const filtered = invoices.filter((inv) => {
    if (inv.status === 'void' || inv.status === 'draft') return false
    const d = new Date(inv.invoiceDate)
    return d.getMonth() + 1 === period.month && d.getFullYear() === period.year
  })

  // Filter eligible purchases for the same period
  const filteredPurchases = purchases.filter((p) => {
    if (p.status === 'draft') return false
    const d = new Date(p.invoiceDate)
    return d.getMonth() + 1 === period.month && d.getFullYear() === period.year
  })

  let outwardInterStateTaxable = 0
  let outwardInterStateIgst = 0
  let outwardIntraStateTaxable = 0
  let outwardIntraStateCgst = 0
  let outwardIntraStateSgst = 0
  let zeroRated = 0
  let exempt = 0

  for (const inv of filtered) {
    if (inv.supplyType === 'inter') {
      outwardInterStateTaxable += inv.taxableValue
      outwardInterStateIgst += inv.igstTotal
    } else {
      outwardIntraStateTaxable += inv.taxableValue
      outwardIntraStateCgst += inv.cgstTotal
      outwardIntraStateSgst += inv.sgstTotal
    }

    for (const item of inv.lineItems) {
      if (item.gstRate === 0) zeroRated += item.taxableValue
    }
  }

  const totalOutputIgst = outwardInterStateIgst
  const totalOutputCgst = outwardIntraStateCgst
  const totalOutputSgst = outwardIntraStateSgst
  const totalOutput = totalOutputIgst + totalOutputCgst + totalOutputSgst

  // Compute ITC from actual eligible purchase invoices (not a hardcoded percentage)
  let itcIgst = 0
  let itcCgst = 0
  let itcSgst = 0

  for (const p of filteredPurchases) {
    // Only count ITC from eligible or claimed purchases
    if (p.itcStatus !== 'eligible' && p.itcStatus !== 'claimed') continue
    // Sum ITC per tax head based on eligible line items
    for (const item of p.lineItems) {
      if (!item.itcEligible) continue
      itcIgst += item.igst
      itcCgst += item.cgst
      itcSgst += item.sgst
    }
  }

  // Add ITC from eligible expenses (rent, professional fees, utilities etc.)
  const filteredExpenses = expenses.filter((e) => {
    if (!e.isItcEligible || !e.isGstRegistered || e.gstAmount <= 0) return false
    const d = new Date(e.date)
    return d.getMonth() + 1 === period.month && d.getFullYear() === period.year
  })
  for (const exp of filteredExpenses) {
    if ((exp.supplyType ?? 'intra') === 'inter') {
      itcIgst += exp.gstAmount
    } else {
      itcCgst += exp.gstAmount / 2
      itcSgst += exp.gstAmount / 2
    }
  }

  // ITC Reversals for the period (Table 4B)
  const periodReversals = itcReversals.filter((r) => {
    const d = new Date(r.reversalDate)
    return d.getMonth() + 1 === period.month && d.getFullYear() === period.year
  })
  const reversedIgst = periodReversals.reduce((s, r) => s + r.igstReversed, 0)
  const reversedCgst = periodReversals.reduce((s, r) => s + r.cgstReversed, 0)
  const reversedSgst = periodReversals.reduce((s, r) => s + r.sgstReversed, 0)
  itcIgst = Math.max(0, itcIgst - reversedIgst)
  itcCgst = Math.max(0, itcCgst - reversedCgst)
  itcSgst = Math.max(0, itcSgst - reversedSgst)
  const totalReversed = Math.round((reversedIgst + reversedCgst + reversedSgst) * 100) / 100

  // Sum raw floats first, then round — avoids penny errors from rounding each component independently
  const netItc = Math.round((itcIgst + itcCgst + itcSgst) * 100) / 100
  itcIgst = Math.round(itcIgst * 100) / 100
  itcCgst = Math.round(itcCgst * 100) / 100
  itcSgst = Math.round(itcSgst * 100) / 100
  const itcB2B = netItc

  // Non-GST supplies: items with gstRate=0 and no HSN (outside GST scope entirely)
  let nonGstValue = 0
  for (const inv of filtered) {
    for (const item of inv.lineItems) {
      if (item.gstRate === 0 && !item.hsnSac?.trim()) {
        nonGstValue += item.taxableValue
      }
    }
  }
  nonGstValue = Math.round(nonGstValue * 100) / 100

  return {
    period,
    section31: {
      outwardTaxableInterState: { taxableValue: outwardInterStateTaxable, igst: outwardInterStateIgst },
      outwardTaxableIntraState: { taxableValue: outwardIntraStateTaxable, cgst: outwardIntraStateCgst, sgst: outwardIntraStateSgst },
      zeroRated: { taxableValue: zeroRated },
      exempt: { taxableValue: exempt },
      nonGst: { taxableValue: nonGstValue },
    },
    itcAvailable: {
      importGoods: 0,
      inwardB2B: itcB2B,
      itcReversed: totalReversed,
      netItc,
    },
    nilExempt: {
      interState: zeroRated,
      intraState: exempt,
    },
    taxLiability: {
      outputIgst: totalOutputIgst,
      outputCgst: totalOutputCgst,
      outputSgst: totalOutputSgst,
      totalOutput,
      // ITC offset: IGST ITC offsets IGST first, then CGST/SGST; CGST offsets CGST; SGST offsets SGST
      itcIgst,
      itcCgst,
      itcSgst,
      netPayableIgst: Math.max(0, totalOutputIgst - itcIgst),
      netPayableCgst: Math.max(0, totalOutputCgst - itcCgst),
      netPayableSgst: Math.max(0, totalOutputSgst - itcSgst),
      netPayableTotal: Math.max(0, totalOutput - netItc),
    },
  }
}
