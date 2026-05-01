import type { LineItem, SupplyType } from '../../types/invoice'
import type { GSTCalcResult, InvoiceTotals } from '../../types/gst'

export function calculateGST(
  taxableValue: number,
  gstRate: number,
  supplyType: SupplyType
): GSTCalcResult {
  const totalTax = roundToTwo(taxableValue * (gstRate / 100))

  if (supplyType === 'intra') {
    const halfTax = roundToTwo(totalTax / 2)
    return {
      cgst: halfTax,
      sgst: roundToTwo(totalTax - halfTax),
      igst: 0,
      totalTax,
      grandTotal: roundToTwo(taxableValue + totalTax),
    }
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      totalTax,
      grandTotal: roundToTwo(taxableValue + totalTax),
    }
  }
}

export interface LineItemCalculation {
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  totalAmount: number
}

export function calculateLineItem(
  quantity: number,
  rate: number,
  discountPercent: number,
  gstRate: number,
  supplyType: SupplyType
): LineItemCalculation {
  const grossValue = roundToTwo(quantity * rate)
  const discountAmount = roundToTwo(grossValue * (discountPercent / 100))
  const taxableValue = roundToTwo(grossValue - discountAmount)
  const gst = calculateGST(taxableValue, gstRate, supplyType)
  return {
    taxableValue,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    totalTax: gst.totalTax,
    totalAmount: gst.grandTotal,
  }
}

export function calculateInvoiceTotals(
  lineItems: Pick<LineItem, 'quantity' | 'rate' | 'discountPercent' | 'gstRate' | 'taxableValue' | 'cgst' | 'sgst' | 'igst' | 'totalAmount'>[],
  supplyType: SupplyType
): InvoiceTotals {
  let subtotal = 0
  let discountAmount = 0
  let taxableValue = 0
  let cgstTotal = 0
  let sgstTotal = 0
  let igstTotal = 0

  for (const item of lineItems) {
    const gross = roundToTwo(item.quantity * item.rate)
    const disc = roundToTwo(gross * (item.discountPercent / 100))
    subtotal += gross
    discountAmount += disc
    taxableValue += item.taxableValue
    cgstTotal += item.cgst
    sgstTotal += item.sgst
    igstTotal += item.igst
  }

  subtotal = roundToTwo(subtotal)
  discountAmount = roundToTwo(discountAmount)
  taxableValue = roundToTwo(taxableValue)
  cgstTotal = roundToTwo(cgstTotal)
  sgstTotal = roundToTwo(sgstTotal)
  igstTotal = roundToTwo(igstTotal)

  const totalTax = roundToTwo(cgstTotal + sgstTotal + igstTotal)
  const rawTotal = roundToTwo(taxableValue + totalTax)
  const roundedTotal = Math.round(rawTotal)
  const roundOff = roundToTwo(roundedTotal - rawTotal)
  const grandTotal = roundedTotal

  return {
    subtotal,
    discountAmount,
    taxableValue,
    cgstTotal,
    sgstTotal,
    igstTotal,
    totalTax,
    roundOff,
    grandTotal,
    amountInWords: '',
  }
}

function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100
}
