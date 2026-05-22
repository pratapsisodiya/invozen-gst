import type { LineItem, SupplyType } from '../../types/invoice'
import type { GSTCalcResult, InvoiceTotals } from '../../types/gst'
import { GST_RATES } from './constants'

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
  cessRate: number
  cessAmount: number
  totalTax: number
  totalAmount: number
}

export function calculateLineItem(
  quantity: number,
  rate: number,
  discountPercent: number,
  gstRate: number,
  supplyType: SupplyType,
  cessRate = 0
): LineItemCalculation {
  if (quantity < 0) throw new Error('Quantity cannot be negative')
  if (rate < 0) throw new Error('Rate cannot be negative')
  if (!(GST_RATES as readonly number[]).includes(gstRate))
    throw new Error(`Invalid GST rate: ${gstRate}. Must be one of ${GST_RATES.join(', ')}`)
  const clampedDiscount = Math.min(100, Math.max(0, discountPercent))
  const grossValue = roundToTwo(quantity * rate)
  const discountAmount = roundToTwo(grossValue * (clampedDiscount / 100))
  const taxableValue = roundToTwo(grossValue - discountAmount)
  const gst = calculateGST(taxableValue, gstRate, supplyType)
  const cessAmount = roundToTwo(taxableValue * (Math.max(0, cessRate) / 100))
  return {
    taxableValue,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    cessRate,
    cessAmount,
    totalTax: gst.totalTax,
    totalAmount: roundToTwo(gst.grandTotal + cessAmount),
  }
}

export function calculateTdsAmount(grossAmount: number, tdsRate: number): number {
  return roundToTwo(grossAmount * (Math.max(0, tdsRate) / 100))
}

export function calculateInvoiceTotals(
  lineItems: Pick<LineItem, 'quantity' | 'rate' | 'discountPercent' | 'gstRate' | 'taxableValue' | 'cgst' | 'sgst' | 'igst' | 'cessRate' | 'cessAmount' | 'totalAmount'>[],
  supplyType: SupplyType
): InvoiceTotals {
  let subtotal = 0
  let discountAmount = 0
  let taxableValue = 0
  let cgstTotal = 0
  let sgstTotal = 0
  let igstTotal = 0
  let cessTotal = 0

  for (const item of lineItems) {
    const gross = roundToTwo(item.quantity * item.rate)
    const disc = roundToTwo(gross * (Math.min(100, Math.max(0, item.discountPercent)) / 100))
    subtotal += gross
    discountAmount += disc
    taxableValue += item.taxableValue
    cgstTotal += item.cgst
    sgstTotal += item.sgst
    igstTotal += item.igst
    cessTotal += item.cessAmount ?? 0
  }

  subtotal = roundToTwo(subtotal)
  discountAmount = roundToTwo(discountAmount)
  taxableValue = roundToTwo(taxableValue)
  cgstTotal = roundToTwo(cgstTotal)
  sgstTotal = roundToTwo(sgstTotal)
  igstTotal = roundToTwo(igstTotal)
  cessTotal = roundToTwo(cessTotal)

  const totalTax = roundToTwo(cgstTotal + sgstTotal + igstTotal)
  const rawTotal = roundToTwo(taxableValue + totalTax + cessTotal)
  // Round to nearest rupee (integer) per GST invoice convention; keep 2-decimal precision
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
    cessTotal,
    totalTax,
    roundOff,
    grandTotal,
    amountInWords: '',
  }
}

function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100
}
