import { generateId } from '@/lib/utils/ids'
import type { Item } from '@/types/item'
import type { Customer } from '@/types/customer'
import { GSTIN_REGEX } from '@/lib/gst/constants'

export interface ImportedItem {
  name: string
  description: string | null
  type: 'product' | 'service'
  hsnCode: string | null
  sacCode: string | null
  unit: string
  defaultRate: number
  defaultGstRate: number
}

export interface ImportResult<T> {
  rows: T[]
  errors: { row: number; message: string }[]
}

function parseCSVText(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const cols: string[] = []
      let cur = ''
      let inQuote = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          inQuote = !inQuote
        } else if (ch === ',' && !inQuote) {
          cols.push(cur.trim())
          cur = ''
        } else {
          cur += ch
        }
      }
      cols.push(cur.trim())
      return cols
    })
}

export function parseItemsFromCSV(text: string): ImportResult<Item> {
  const rows: Item[] = []
  const errors: { row: number; message: string }[] = []

  const parsed = parseCSVText(text)
  if (parsed.length < 2) {
    errors.push({ row: 0, message: 'File must have a header row and at least one data row' })
    return { rows, errors }
  }

  const headers = parsed[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'))
  const col = (name: string) => headers.indexOf(name)

  for (let i = 1; i < parsed.length; i++) {
    const r = parsed[i]
    const get = (name: string) => r[col(name)]?.trim() ?? ''

    const name = get('name') || get('item_name') || get('product_name')
    const rate = parseFloat(get('rate') || get('price') || get('default_rate') || '0')
    const gstRate = parseFloat(get('gst_rate') || get('gst%') || get('tax_rate') || '18')

    if (!name) {
      errors.push({ row: i + 1, message: 'Name is required' })
      continue
    }

    const typeRaw = (get('type') || 'product').toLowerCase()

    rows.push({
      id: generateId(),
      name,
      description: get('description') || null,
      type: typeRaw.includes('service') ? 'service' : 'product',
      hsnCode: get('hsn_code') || get('hsn') || null,
      sacCode: get('sac_code') || get('sac') || null,
      unit: (get('unit') || 'NOS').toUpperCase(),
      defaultRate: isNaN(rate) ? 0 : rate,
      defaultGstRate: isNaN(gstRate) ? 18 : gstRate,
      isActive: true,
      trackInventory: false,
      stockQuantity: null,
      lowStockThreshold: null,
      createdAt: new Date().toISOString(),
    })
  }

  return { rows, errors }
}

export function getItemCSVTemplate(): string {
  const headers = ['Name', 'Description', 'Type', 'HSN Code', 'SAC Code', 'Unit', 'Rate', 'GST Rate']
  const sample = ['Software License', 'Annual subscription', 'service', '', '997331', 'NOS', '10000', '18']
  return [headers.join(','), sample.join(',')].join('\n')
}

export function parseCustomersFromCSV(text: string): ImportResult<Customer> {
  const rows: Customer[] = []
  const errors: { row: number; message: string }[] = []

  const parsed = parseCSVText(text)
  if (parsed.length < 2) {
    errors.push({ row: 0, message: 'File must have a header row and at least one data row' })
    return { rows, errors }
  }

  const headers = parsed[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'))
  const col = (name: string) => headers.indexOf(name)

  for (let i = 1; i < parsed.length; i++) {
    const r = parsed[i]
    const get = (name: string) => r[col(name)]?.trim() ?? ''

    const name = get('name') || get('customer_name')
    if (!name) {
      errors.push({ row: i + 1, message: 'Name is required' })
      continue
    }

    const gstin = get('gstin') || null
    if (gstin && !GSTIN_REGEX.test(gstin)) {
      errors.push({ row: i + 1, message: `Row ${i + 1}: Invalid GSTIN format "${gstin}"` })
    }

    const creditLimit = parseFloat(get('credit_limit') || '0')
    const paymentTermsDays = parseInt(get('payment_terms_days') || '30', 10)

    rows.push({
      id: generateId(),
      name,
      businessName: get('business_name') || null,
      contactPerson: null,
      email: get('email') || null,
      phone: get('phone') || null,
      gstin,
      gstinState: get('state') || null,
      gstinStateCode: get('state_code') || null,
      businessType: gstin ? 'b2b' : 'b2c',
      billingAddress: {
        line1: '',
        line2: null,
        city: '',
        state: get('state') || '',
        stateCode: get('state_code') || '',
        pincode: '',
      },
      shippingAddress: null,
      creditLimit: isNaN(creditLimit) ? null : creditLimit,
      paymentTermsDays: isNaN(paymentTermsDays) ? 30 : paymentTermsDays,
      totalInvoiced: 0,
      totalPaid: 0,
      notes: null,
      tags: [],
      createdAt: new Date().toISOString(),
    })
  }

  return { rows, errors }
}

export function getCustomerCSVTemplate(): string {
  const headers = ['Name', 'Business Name', 'GSTIN', 'Email', 'Phone', 'State', 'State Code', 'Payment Terms Days', 'Credit Limit']
  const sample = ['Acme Pvt Ltd', 'Acme Corporation', '27AAACR5055K1ZK', 'accounts@acme.com', '9876543210', 'Maharashtra', '27', '30', '100000']
  return [headers.join(','), sample.join(',')].join('\n')
}

export function downloadTemplate(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
