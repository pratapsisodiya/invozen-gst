import type { Quotation } from '../../types/quotation'
import type { LineItem } from '../../types/invoice'
import { calculateLineItem } from '../gst/calculator'

function makeQLine(
  id: string, itemId: string, description: string, hsnSac: string,
  quantity: number, unit: string, rate: number, discountPercent: number,
  gstRate: number, supplyType: 'intra' | 'inter'
): LineItem {
  const calc = calculateLineItem(quantity, rate, discountPercent, gstRate, supplyType)
  return { id, itemId, description, hsnSac, quantity, unit, rate, discountPercent, gstRate, ...calc }
}

function makeQuotation(
  id: string, qNum: string, status: Quotation['status'],
  custId: string, custName: string, custGstin: string | null, custState: string, custStateCode: string,
  supplyType: 'intra' | 'inter', qDate: string, validDays: number,
  lineItems: LineItem[], notes: string = '',
  convertedId: string | null = null, convertedNum: string | null = null
): Quotation {
  const validUntil = new Date(qDate)
  validUntil.setDate(validUntil.getDate() + validDays)
  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.rate, 0)
  const discountAmount = lineItems.reduce((s, li) => s + li.quantity * li.rate * li.discountPercent / 100, 0)
  const taxableValue = Math.round(lineItems.reduce((s, li) => s + li.taxableValue, 0) * 100) / 100
  const cgstTotal = Math.round(lineItems.reduce((s, li) => s + li.cgst, 0) * 100) / 100
  const sgstTotal = Math.round(lineItems.reduce((s, li) => s + li.sgst, 0) * 100) / 100
  const igstTotal = Math.round(lineItems.reduce((s, li) => s + li.igst, 0) * 100) / 100
  const totalTax = Math.round((cgstTotal + sgstTotal + igstTotal) * 100) / 100
  const grandTotal = Math.round(taxableValue + totalTax)
  return {
    id, quotationNumber: qNum, status,
    customerId: custId,
    customerSnapshot: { name: custName, gstin: custGstin, address: '123 Business St', state: custState, stateCode: custStateCode },
    supplyType, quotationDate: qDate,
    validUntil: validUntil.toISOString().split('T')[0],
    lineItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxableValue, cgstTotal, sgstTotal, igstTotal, totalTax, grandTotal,
    notes, terms: 'Prices valid for the period mentioned. Subject to availability.',
    convertedToInvoiceId: convertedId,
    convertedToInvoiceNumber: convertedNum,
    createdAt: `${qDate}T10:00:00Z`,
    updatedAt: `${qDate}T10:00:00Z`,
  }
}

export const mockQuotations: Quotation[] = [
  makeQuotation(
    'qt-001', 'QT-2025-001', 'converted',
    'cust-01', 'Ravi Sharma', '27AABCS1234A1Z5', 'Maharashtra', '27',
    'intra', '2025-01-10', 30,
    [makeQLine('qli-001a', 'item-01', 'Laptop - Core i5', '8471', 5, 'NOS', 55000, 5, 18, 'intra'),
     makeQLine('qli-001b', 'item-02', 'Desktop Computer', '8471', 3, 'NOS', 45000, 5, 18, 'intra')],
    'Quote for new office setup',
    'inv-034', 'PE-2025-034'
  ),
  makeQuotation(
    'qt-002', 'QT-2025-002', 'accepted',
    'cust-05', 'Rajesh Menon', '29AABCM7890E1Z6', 'Karnataka', '29',
    'inter', '2025-01-20', 30,
    [makeQLine('qli-002a', 'item-13', 'Air Conditioner 1.5T', '8415', 8, 'NOS', 38000, 0, 28, 'inter'),
     makeQLine('qli-002b', 'item-10', 'LED Bulb 9W', '8539', 200, 'NOS', 180, 0, 12, 'inter')],
    'Office cooling and lighting upgrade'
  ),
  makeQuotation(
    'qt-003', 'QT-2025-003', 'sent',
    'cust-03', 'Amit Kumar', '07AADCK9012C1Z1', 'Delhi', '07',
    'inter', '2025-02-01', 15,
    [makeQLine('qli-003a', 'item-16', 'IT Consulting', '998314', 20, 'HRS', 3500, 0, 18, 'inter'),
     makeQLine('qli-003b', 'item-18', 'Web Design', '998313', 1, 'NOS', 25000, 0, 18, 'inter')],
    'Digital transformation project phase 1'
  ),
  makeQuotation(
    'qt-004', 'QT-2025-004', 'rejected',
    'cust-07', 'Vikram Singh', '08AABCS4567G1Z2', 'Rajasthan', '08',
    'inter', '2025-01-15', 20,
    [makeQLine('qli-004a', 'item-09', 'Cement Bags', '2523', 500, 'BAG', 420, 0, 28, 'inter'),
     makeQLine('qli-004b', 'item-08', 'Steel Pipes', '7306', 200, 'MTR', 450, 0, 18, 'inter')],
    'Q1 construction materials supply'
  ),
  makeQuotation(
    'qt-005', 'QT-2025-005', 'draft',
    'cust-04', 'Sunita Patel', '24AABCP3456D1Z8', 'Gujarat', '24',
    'inter', '2025-02-12', 30,
    [makeQLine('qli-005a', 'item-07', 'Pharmaceutical Tablet', '3004', 1000, 'PKT', 120, 5, 12, 'inter'),
     makeQLine('qli-005b', 'item-14', 'Cooking Oil 1L', '1512', 500, 'LTR', 180, 0, 5, 'inter')],
    'Feb–Mar supply quotation'
  ),
]
