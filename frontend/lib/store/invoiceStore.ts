import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Invoice, InvoiceFilter, InvoiceStatus } from '../../types/invoice'
import { generateId } from '../utils/ids'

interface InvoiceState {
  invoices: Invoice[]
  filter: InvoiceFilter
  addInvoice: (invoice: Invoice) => void
  updateInvoice: (id: string, partial: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void
  duplicateInvoice: (id: string) => void
  setFilter: (filter: Partial<InvoiceFilter>) => void
  resetFilter: () => void
  getInvoiceById: (id: string) => Invoice | undefined
  getFilteredInvoices: () => Invoice[]
  getInvoicesByCustomer: (customerId: string) => Invoice[]
  getTotalsByPeriod: (month: number, year: number) => { revenue: number; gst: number; invoiceCount: number; outstanding: number; overdue: number }
  markAsSent: (id: string) => void
  markAsPaid: (id: string, amountPaid: number) => void
  setInvoices: (invoices: Invoice[]) => void
}

const defaultFilter: InvoiceFilter = {
  status: 'all',
  customerId: null,
  dateFrom: null,
  dateTo: null,
  search: '',
}

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    immer((set, get) => ({
      invoices: [],
      filter: defaultFilter,
      addInvoice: (invoice) => set((state) => { state.invoices.unshift(invoice) }),
      duplicateInvoice: (id) =>
        set((state) => {
          const original = state.invoices.find((i) => i.id === id)
          if (!original) return
          const duplicate: Invoice = {
            ...original,
            id: generateId(),
            invoiceNumber: original.invoiceNumber + '-COPY',
            status: 'draft' as const,
            amountPaid: 0,
            balanceDue: original.grandTotal,
            irnNumber: null,
            irnStatus: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          state.invoices.unshift(duplicate)
        }),
      updateInvoice: (id, partial) =>
        set((state) => {
          const idx = state.invoices.findIndex((i) => i.id === id)
          if (idx !== -1) Object.assign(state.invoices[idx], { ...partial, updatedAt: new Date().toISOString() })
        }),
      deleteInvoice: (id) =>
        set((state) => { state.invoices = state.invoices.filter((i) => i.id !== id) }),
      setFilter: (filter) =>
        set((state) => { Object.assign(state.filter, filter) }),
      resetFilter: () => set((state) => { state.filter = defaultFilter }),
      getInvoiceById: (id) => get().invoices.find((i) => i.id === id),
      getFilteredInvoices: () => {
        const { invoices, filter } = get()
        return invoices.filter((inv) => {
          if (filter.status !== 'all' && inv.status !== filter.status) return false
          if (filter.customerId && inv.customerId !== filter.customerId) return false
          if (filter.dateFrom && inv.invoiceDate < filter.dateFrom) return false
          if (filter.dateTo && inv.invoiceDate > filter.dateTo) return false
          if (filter.search) {
            const q = filter.search.toLowerCase()
            if (
              !inv.invoiceNumber.toLowerCase().includes(q) &&
              !inv.customerSnapshot.name.toLowerCase().includes(q)
            )
              return false
          }
          return true
        })
      },
      getInvoicesByCustomer: (customerId) =>
        get().invoices.filter((i) => i.customerId === customerId),
      getTotalsByPeriod: (month, year) => {
        const invs = get().invoices.filter((inv) => {
          const d = new Date(inv.invoiceDate)
          return d.getMonth() + 1 === month && d.getFullYear() === year && inv.status !== 'void'
        })
        const revenue = invs.filter((i) => i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0)
        const gst = invs.filter((i) => i.status === 'paid').reduce((s, i) => s + i.totalTax, 0)
        const outstanding = invs.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0)
        const overdue = invs.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.balanceDue, 0)
        return { revenue, gst, invoiceCount: invs.length, outstanding, overdue }
      },
      markAsSent: (id) =>
        set((state) => {
          const inv = state.invoices.find((i) => i.id === id)
          if (inv && inv.status === 'draft') inv.status = 'sent'
        }),
      markAsPaid: (id, amountPaid) =>
        set((state) => {
          const inv = state.invoices.find((i) => i.id === id)
          if (inv) {
            inv.amountPaid = Math.min(inv.grandTotal, (inv.amountPaid || 0) + amountPaid)
            inv.balanceDue = Math.max(0, inv.grandTotal - inv.amountPaid)
            if (inv.balanceDue === 0) inv.status = 'paid'
          }
        }),
      setInvoices: (invoices) => set((state) => { state.invoices = invoices }),
    })),
    { name: 'invozen-invoices' }
  )
)
