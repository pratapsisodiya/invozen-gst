import type { CreditNote, DebitNote } from '../../types/creditNote'
import type { LineItem } from '../../types/invoice'
import type { PurchaseLineItem } from '../../types/purchase'
import { calculateLineItem } from '../gst/calculator'

function makeCNLine(
  id: string, itemId: string, description: string, hsnSac: string,
  quantity: number, unit: string, rate: number, discountPercent: number,
  gstRate: number, supplyType: 'intra' | 'inter'
): LineItem {
  const calc = calculateLineItem(quantity, rate, discountPercent, gstRate, supplyType)
  return { id, itemId, description, hsnSac, quantity, unit, rate, discountPercent, gstRate, ...calc }
}

function makeDebitLine(
  id: string, description: string, hsnSac: string,
  quantity: number, unit: string, rate: number,
  gstRate: number, supplyType: 'intra' | 'inter'
): PurchaseLineItem {
  const taxableValue = Math.round(quantity * rate * 100) / 100
  const gstAmount = Math.round(taxableValue * gstRate / 100 * 100) / 100
  const cgst = supplyType === 'intra' ? Math.round(gstAmount / 2 * 100) / 100 : 0
  const sgst = supplyType === 'intra' ? Math.round(gstAmount / 2 * 100) / 100 : 0
  const igst = supplyType === 'inter' ? gstAmount : 0
  return { id, description, hsnSac, quantity, unit, rate, discountPercent: 0, taxableValue, gstRate, cgst, sgst, igst, totalAmount: taxableValue + gstAmount, itcEligible: true }
}

export const mockCreditNotes: CreditNote[] = [
  {
    id: 'cn-001',
    creditNoteNumber: 'CN-2025-001',
    status: 'approved',
    linkedInvoiceId: 'inv-001',
    linkedInvoiceNumber: 'PE-2025-001',
    customerId: 'cust-01',
    customerSnapshot: { name: 'Ravi Sharma', gstin: '27AABCS1234A1Z5', address: '45 Linking Road, Mumbai', state: 'Maharashtra', stateCode: '27' },
    reason: 'sales_return',
    lineItems: [
      makeCNLine('cnli-001a', 'item-03', 'Printer - Laser (Return)', '8443', 1, 'NOS', 12000, 5, 18, 'intra'),
    ],
    subtotal: 12000,
    taxableValue: 11400,
    cgstTotal: 1026,
    sgstTotal: 1026,
    igstTotal: 0,
    totalTax: 2052,
    grandTotal: 13452,
    notes: 'Printer returned — defective unit',
    createdAt: '2024-12-10T10:00:00Z',
    updatedAt: '2024-12-12T10:00:00Z',
  },
  {
    id: 'cn-002',
    creditNoteNumber: 'CN-2025-002',
    status: 'approved',
    linkedInvoiceId: 'inv-007',
    linkedInvoiceNumber: 'PE-2025-007',
    customerId: 'cust-02',
    customerSnapshot: { name: 'Priya Nair', gstin: '32AACPN5678B1Z3', address: '12 MG Road, Kochi', state: 'Kerala', stateCode: '32' },
    reason: 'discount_allowed',
    lineItems: [
      makeCNLine('cnli-002a', 'item-05', "Women's Kurti (Extra Discount)", '6204', 20, 'NOS', 850, 0, 5, 'inter'),
    ],
    subtotal: 17000,
    taxableValue: 17000,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 850,
    totalTax: 850,
    grandTotal: 17850,
    notes: 'Post-sale discount for bulk order',
    createdAt: '2025-01-08T10:00:00Z',
    updatedAt: '2025-01-09T10:00:00Z',
  },
  {
    id: 'cn-003',
    creditNoteNumber: 'CN-2025-003',
    status: 'draft',
    linkedInvoiceId: 'inv-016',
    linkedInvoiceNumber: 'PE-2025-016',
    customerId: 'cust-03',
    customerSnapshot: { name: 'Amit Kumar', gstin: '07AADCK9012C1Z1', address: '88 Karol Bagh, New Delhi', state: 'Delhi', stateCode: '07' },
    reason: 'rate_difference',
    lineItems: [
      makeCNLine('cnli-003a', 'item-16', 'IT Consulting (Rate Adj)', '998314', 5, 'HRS', 500, 0, 18, 'inter'),
    ],
    subtotal: 2500,
    taxableValue: 2500,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 450,
    totalTax: 450,
    grandTotal: 2950,
    notes: 'Rate correction — agreed rate was ₹3000/hr not ₹3500/hr',
    createdAt: '2025-01-25T10:00:00Z',
    updatedAt: '2025-01-25T10:00:00Z',
  },
  {
    id: 'cn-004',
    creditNoteNumber: 'CN-2025-004',
    status: 'adjusted',
    linkedInvoiceId: 'inv-008',
    linkedInvoiceNumber: 'PE-2025-008',
    customerId: 'cust-05',
    customerSnapshot: { name: 'Rajesh Menon', gstin: '29AABCM7890E1Z6', address: '56 Industrial Area, Bangalore', state: 'Karnataka', stateCode: '29' },
    reason: 'sales_return',
    lineItems: [
      makeCNLine('cnli-004a', 'item-12', 'Auto Parts - Brake Pad (Return)', '8708', 2, 'SET', 1800, 0, 28, 'inter'),
    ],
    subtotal: 3600,
    taxableValue: 3600,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 1008,
    totalTax: 1008,
    grandTotal: 4608,
    notes: '2 sets returned — wrong part number supplied',
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-02-01T10:00:00Z',
  },
]

export const mockDebitNotes: DebitNote[] = [
  {
    id: 'dn-001',
    debitNoteNumber: 'DN-2025-001',
    status: 'approved',
    linkedPurchaseId: 'pur-002',
    linkedPurchaseNumber: 'PUR-2025-002',
    vendorId: 'vend-02',
    vendorSnapshot: { name: 'Gupta Steel & Metals', gstin: '08AABCG5678B1Z7', state: 'Rajasthan' },
    reason: 'purchase_return',
    lineItems: [
      makeDebitLine('dnli-001a', 'Steel Pipes 40mm (Return)', '7306', 10, 'MTR', 420, 18, 'inter'),
    ],
    subtotal: 4200,
    taxableValue: 4200,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 756,
    totalTax: 756,
    grandTotal: 4956,
    notes: '10m returned — diameter mismatch',
    createdAt: '2024-12-10T10:00:00Z',
    updatedAt: '2024-12-12T10:00:00Z',
  },
  {
    id: 'dn-002',
    debitNoteNumber: 'DN-2025-002',
    status: 'draft',
    linkedPurchaseId: 'pur-003',
    linkedPurchaseNumber: 'PUR-2025-003',
    vendorId: 'vend-05',
    vendorSnapshot: { name: 'Rekha Cloud & IT Services', gstin: '27AABCR7890E1Z1', state: 'Maharashtra' },
    reason: 'additional_charges',
    lineItems: [
      makeDebitLine('dnli-002a', 'Setup Fee - Cloud Migration', '997316', 1, 'NOS', 5000, 18, 'intra'),
    ],
    subtotal: 5000,
    taxableValue: 5000,
    cgstTotal: 450,
    sgstTotal: 450,
    igstTotal: 0,
    totalTax: 900,
    grandTotal: 5900,
    notes: 'Additional setup charges not in original quote',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  },
]
