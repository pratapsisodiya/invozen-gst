import { useBusinessStore } from '@/stores/businessStore'
import { useCustomerStore } from '@/stores/customerStore'
import { useItemStore } from '@/stores/itemStore'
import { useInvoiceStore } from '@/stores/invoiceStore'
import type { BusinessProfile } from '@/lib/types/business'
import type { Customer } from '@/lib/types/customer'
import type { Item } from '@/lib/types/item'
import type { Invoice, LineItem } from '@/lib/types/invoice'
import { calculateLineItem, calculateInvoiceTotals } from '@/lib/gst/calculator'
import { generateId } from '@/lib/utils/ids'

export function seedMockData() {
  const businessStore = useBusinessStore.getState()
  const customerStore = useCustomerStore.getState()
  const itemStore = useItemStore.getState()
  const invoiceStore = useInvoiceStore.getState()

  // Seed business profile if not exists
  if (!businessStore.profile) {
    const mockBusiness: BusinessProfile = {
      id: 'business-1',
      name: 'Demo Business Pvt Ltd',
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      address: '123 Main Street',
      city: 'Bangalore',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '560001',
      phone: '+91 9876543210',
      email: 'demo@business.com',
      logo: null,
      website: 'www.demobusiness.com',
    }
    businessStore.setProfile(mockBusiness)
  }

  // Seed customers if empty
  if (customerStore.customers.length === 0) {
    const mockCustomers: Customer[] = [
      {
        id: 'cust-1',
        name: 'Acme Corp',
        gstin: '29AABCU9603R1ZP',
        email: 'contact@acme.com',
        phone: '+91 9876543211',
        address: '456 Business Park',
        city: 'Bangalore',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '560002',
        customerType: 'business',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'cust-2',
        name: 'Tech Solutions Ltd',
        gstin: '27AAACT6304E1Z9',
        email: 'info@techsolutions.com',
        phone: '+91 9876543212',
        address: '789 Tech Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        stateCode: '27',
        pincode: '400001',
        customerType: 'business',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'cust-3',
        name: 'John Doe',
        gstin: null,
        email: 'john@example.com',
        phone: '+91 9876543213',
        address: '321 Residential Area',
        city: 'Bangalore',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '560003',
        customerType: 'individual',
        createdAt: new Date().toISOString(),
      },
    ]
    customerStore.setCustomers(mockCustomers)
  }

  // Seed items if empty
  if (itemStore.items.length === 0) {
    const mockItems: Item[] = [
      {
        id: 'item-1',
        name: 'Web Development Services',
        description: 'Full stack web development',
        hsnSac: '998314',
        unit: 'hour',
        rate: 2000,
        gstRate: 18,
        itemType: 'service',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'item-2',
        name: 'Software License',
        description: 'Annual software license',
        hsnSac: '997331',
        unit: 'license',
        rate: 50000,
        gstRate: 18,
        itemType: 'service',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'item-3',
        name: 'Consulting Services',
        description: 'Business consulting',
        hsnSac: '998313',
        unit: 'day',
        rate: 15000,
        gstRate: 18,
        itemType: 'service',
        createdAt: new Date().toISOString(),
      },
    ]
    itemStore.setItems(mockItems)
  }

  // Seed invoices if empty
  if (invoiceStore.invoices.length === 0) {
    const customers = customerStore.customers
    const items = itemStore.items

    if (customers.length > 0 && items.length > 0) {
      const mockInvoices: Invoice[] = []

      // Invoice 1 - Paid
      const lineItems1: LineItem[] = [
        {
          id: generateId(),
          itemId: items[0].id,
          description: items[0].name,
          hsnSac: items[0].hsnSac,
          quantity: 40,
          unit: items[0].unit,
          rate: items[0].rate,
          discountPercent: 0,
          gstRate: items[0].gstRate,
          ...calculateLineItem(40, items[0].rate, 0, items[0].gstRate, 'intra'),
        },
      ]
      const totals1 = calculateInvoiceTotals(lineItems1, 'intra')

      mockInvoices.push({
        id: 'inv-1',
        invoiceNumber: 'INV-2025-001',
        invoiceType: 'tax_invoice',
        status: 'paid',
        customerId: customers[0].id,
        customerSnapshot: {
          name: customers[0].name,
          gstin: customers[0].gstin,
          address: customers[0].address,
          state: customers[0].state,
          stateCode: customers[0].stateCode,
        },
        supplyType: 'intra',
        invoiceDate: '2025-01-15',
        dueDate: '2025-02-14',
        lineItems: lineItems1,
        ...totals1,
        amountPaid: totals1.grandTotal,
        balanceDue: 0,
        notes: 'Thank you for your business!',
        terms: 'Payment due within 30 days',
        placeOfSupply: '29-Karnataka',
        irnNumber: null,
        irnStatus: null,
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-20T15:30:00Z',
      })

      // Invoice 2 - Sent (Outstanding)
      const lineItems2: LineItem[] = [
        {
          id: generateId(),
          itemId: items[1].id,
          description: items[1].name,
          hsnSac: items[1].hsnSac,
          quantity: 1,
          unit: items[1].unit,
          rate: items[1].rate,
          discountPercent: 10,
          gstRate: items[1].gstRate,
          ...calculateLineItem(1, items[1].rate, 10, items[1].gstRate, 'inter'),
        },
      ]
      const totals2 = calculateInvoiceTotals(lineItems2, 'inter')

      mockInvoices.push({
        id: 'inv-2',
        invoiceNumber: 'INV-2025-002',
        invoiceType: 'tax_invoice',
        status: 'sent',
        customerId: customers[1].id,
        customerSnapshot: {
          name: customers[1].name,
          gstin: customers[1].gstin,
          address: customers[1].address,
          state: customers[1].state,
          stateCode: customers[1].stateCode,
        },
        supplyType: 'inter',
        invoiceDate: '2025-01-20',
        dueDate: '2025-02-19',
        lineItems: lineItems2,
        ...totals2,
        amountPaid: 0,
        balanceDue: totals2.grandTotal,
        notes: '',
        terms: 'Payment due within 30 days',
        placeOfSupply: '27-Maharashtra',
        irnNumber: null,
        irnStatus: null,
        createdAt: '2025-01-20T14:00:00Z',
        updatedAt: '2025-01-20T14:00:00Z',
      })

      // Invoice 3 - Draft
      const lineItems3: LineItem[] = [
        {
          id: generateId(),
          itemId: items[2].id,
          description: items[2].name,
          hsnSac: items[2].hsnSac,
          quantity: 3,
          unit: items[2].unit,
          rate: items[2].rate,
          discountPercent: 0,
          gstRate: items[2].gstRate,
          ...calculateLineItem(3, items[2].rate, 0, items[2].gstRate, 'intra'),
        },
      ]
      const totals3 = calculateInvoiceTotals(lineItems3, 'intra')

      mockInvoices.push({
        id: 'inv-3',
        invoiceNumber: 'INV-2025-003',
        invoiceType: 'tax_invoice',
        status: 'draft',
        customerId: customers[2].id,
        customerSnapshot: {
          name: customers[2].name,
          gstin: customers[2].gstin,
          address: customers[2].address,
          state: customers[2].state,
          stateCode: customers[2].stateCode,
        },
        supplyType: 'intra',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lineItems: lineItems3,
        ...totals3,
        amountPaid: 0,
        balanceDue: totals3.grandTotal,
        notes: '',
        terms: '',
        placeOfSupply: '29-Karnataka',
        irnNumber: null,
        irnStatus: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      invoiceStore.setInvoices(mockInvoices)
    }
  }
}
