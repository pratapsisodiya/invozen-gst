import type { Invoice } from '../../types/invoice'
import type { GSTR3BSummary } from '../../types/gst'

export function calculateGSTR3BSummary(
  invoices: Invoice[],
  _purchases: unknown[],
  period: { month: number; year: number }
): GSTR3BSummary {
  const filtered = invoices.filter((inv) => {
    if (inv.status === 'void' || inv.status === 'draft') return false
    const d = new Date(inv.invoiceDate)
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

  const itcB2B = Math.round(totalOutput * 0.1 * 100) / 100
  const netItc = itcB2B

  return {
    period,
    section31: {
      outwardTaxableInterState: { taxableValue: outwardInterStateTaxable, igst: outwardInterStateIgst },
      outwardTaxableIntraState: { taxableValue: outwardIntraStateTaxable, cgst: outwardIntraStateCgst, sgst: outwardIntraStateSgst },
      zeroRated: { taxableValue: zeroRated },
      exempt: { taxableValue: exempt },
      nonGst: { taxableValue: 0 },
    },
    itcAvailable: {
      importGoods: 0,
      inwardB2B: itcB2B,
      itcReversed: 0,
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
      itcIgst: Math.round(netItc * 0.4 * 100) / 100,
      itcCgst: Math.round(netItc * 0.3 * 100) / 100,
      itcSgst: Math.round(netItc * 0.3 * 100) / 100,
      netPayableIgst: Math.max(0, totalOutputIgst - Math.round(netItc * 0.4 * 100) / 100),
      netPayableCgst: Math.max(0, totalOutputCgst - Math.round(netItc * 0.3 * 100) / 100),
      netPayableSgst: Math.max(0, totalOutputSgst - Math.round(netItc * 0.3 * 100) / 100),
      netPayableTotal: Math.max(0, totalOutput - netItc),
    },
  }
}
