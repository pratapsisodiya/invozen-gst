import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Invoice, InvoiceFilter } from '@/lib/types/invoice'

interface InvoiceState {
  invoices: Invoice[]
  filter: InvoiceFilter
  setInvoices: (invoices: Invoice[]) => void
  addInvoice: (invoice: Invoice) => void
  updateInvoice: (id: string, updates: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void
  setFilter: (filter: Partial<InvoiceFilter>) => void
  getInvoiceById: (id: string) => Invoice | undefined
  getFilteredInvoices: () => Invoice[]
  getPeriodTotals: (month: number, year: number) => {
    revenue: number
    outstanding: number
    overdue: number
    gstCollected: number
  }
  markAsSent: (id: string) => void
  markAsPaid: (id: string, amount: number) => void
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
    (set, get) => ({
      invoices: [],
      filter: defaultFilter,

      setInvoices: (invoices) => set({ invoices }),

      addInvoice: (invoice) =>
        set((state) => ({ invoices: [invoice, ...state.invoices] })),

      updateInvoice: (id, updates) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...updates } : inv
          ),
        })),

      deleteInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
        })),

      setFilter: (filter) =>
        set((state) => ({ filter: { ...state.filter, ...filter } })),

      getInvoiceById: (id) => {
        return get().invoices.find((inv) => inv.id === id)
      },

      getFilteredInvoices: () => {
        const { invoices, filter } = get()
        let filtered = invoices

        // Filter by status
        if (filter.status !== 'all') {
          filtered = filtered.filter((inv) => inv.status === filter.status)
        }

        // Filter by customer
        if (filter.customerId) {
          filtered = filtered.filter((inv) => inv.customerId === filter.customerId)
        }

        // Filter by date range
        if (filter.dateFrom) {
          filtered = filtered.filter(
            (inv) => new Date(inv.invoiceDate) >= new Date(filter.dateFrom!)
          )
        }
        if (filter.dateTo) {
          filtered = filtered.filter(
            (inv) => new Date(inv.invoiceDate) <= new Date(filter.dateTo!)
          )
        }

        // Search by invoice number or customer name
        if (filter.search) {
          const search = filter.search.toLowerCase()
          filtered = filtered.filter(
            (inv) =>
              inv.invoiceNumber.toLowerCase().includes(search) ||
              inv.customerSnapshot.name.toLowerCase().includes(search)
          )
        }

        return filtered
      },

      getPeriodTotals: (month, year) => {
        const { invoices } = get()
        const periodInvoices = invoices.filter((inv) => {
          const date = new Date(inv.invoiceDate)
          return date.getMonth() + 1 === month && date.getFullYear() === year
        })

        let revenue = 0
        let outstanding = 0
        let overdue = 0
        let gstCollected = 0

        periodInvoices.forEach((inv) => {
          if (inv.status !== 'void') {
            revenue += inv.grandTotal
            gstCollected += inv.totalTax

            if (inv.status === 'sent' || inv.status === 'overdue') {
              outstanding += inv.balanceDue
            }

            if (inv.status === 'overdue') {
              overdue += inv.balanceDue
            }
          }
        })

        return { revenue, outstanding, overdue, gstCollected }
      },

      markAsSent: (id) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id && inv.status === 'draft' ? { ...inv, status: 'sent' } : inv
          ),
        })),

      markAsPaid: (id, amount) =>
        set((state) => ({
          invoices: state.invoices.map((inv) => {
            if (inv.id !== id) return inv
            const amountPaid = Math.min(inv.grandTotal, (inv.amountPaid ?? 0) + amount)
            const balanceDue = Math.max(0, inv.grandTotal - amountPaid)
            return { ...inv, amountPaid, balanceDue, status: balanceDue === 0 ? 'paid' : inv.status }
          }),
        })),
    }),
    {
      name: 'invozen-invoices',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
