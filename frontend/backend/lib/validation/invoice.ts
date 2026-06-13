import { z } from 'zod'

/**
 * Validation schemas for invoice operations using Zod
 */

const lineItemSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid().nullable(),
  description: z.string().min(1, 'Description is required'),
  hsnSac: z.string().regex(/^\d{4,8}$/, 'HSN/SAC code must be 4-8 digits'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.number().nonnegative('Rate cannot be negative'),
  discountPercent: z.number().min(0).max(100, 'Discount must be between 0-100%'),
  taxableValue: z.number().nonnegative('Taxable value cannot be negative'),
  gstRate: z.number().min(0).max(28, 'GST rate must be between 0-28%'),
  cgst: z.number().nonnegative('CGST cannot be negative'),
  sgst: z.number().nonnegative('SGST cannot be negative'),
  igst: z.number().nonnegative('IGST cannot be negative'),
  cessRate: z.number().min(0, 'Cess rate cannot be negative'),
  cessAmount: z.number().nonnegative('Cess amount cannot be negative'),
  totalAmount: z.number().nonnegative('Total amount cannot be negative'),
})

const customerSnapshotSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/, 'Invalid GSTIN format').nullable(),
  address: z.string(),
  state: z.string(),
  stateCode: z.string().regex(/^\d{2}$/, 'State code must be 2 digits'),
})

export const createInvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceType: z.enum(['tax_invoice', 'proforma', 'credit_note', 'debit_note', 'receipt_voucher', 'bill_of_supply']),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']),
  customerId: z.string().uuid(),
  customerSnapshot: customerSnapshotSchema,
  supplyType: z.enum(['intra', 'inter']),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  subtotal: z.number().nonnegative(),
  discountAmount: z.number().nonnegative(),
  taxableValue: z.number().nonnegative(),
  cgstTotal: z.number().nonnegative(),
  sgstTotal: z.number().nonnegative(),
  igstTotal: z.number().nonnegative(),
  cessTotal: z.number().nonnegative(),
  totalTax: z.number().nonnegative(),
  grandTotal: z.number().positive('Grand total must be positive'),
  amountPaid: z.number().nonnegative(),
  balanceDue: z.number().nonnegative(),
  notes: z.string(),
  terms: z.string(),
  placeOfSupply: z.string(),
  irnNumber: z.string().nullable(),
  irnStatus: z.enum(['pending', 'generated', 'cancelled']).nullable(),
  tdsSection: z.string().nullable(),
  tdsRate: z.number().nullable(),
  tdsAmount: z.number().nullable(),
  amendedInvoiceId: z.string().uuid().nullable(),
  amendedInvoiceNumber: z.string().nullable(),
  amendmentReason: z.string().nullable(),
  currency: z.string().default('INR'),
  exchangeRate: z.number().positive().default(1),
  attachmentIds: z.array(z.string().uuid()),
})

export const updateInvoiceSchema = createInvoiceSchema.partial()

export const generateIrnSchema = z.object({
  invoiceId: z.string().uuid(),
})

export const cancelIrnSchema = z.object({
  reason: z.enum(['1', '2', '3', '4'], {
    error: 'Reason must be: 1=Duplicate, 2=Data Entry Mistake, 3=Order Cancelled, 4=Other'
  }),
  remarks: z.string().min(3, 'Remarks must be at least 3 characters').max(100, 'Remarks must be at most 100 characters'),
})
