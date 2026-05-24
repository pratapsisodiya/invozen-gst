import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Invoice, InvoiceFilter, InvoiceStatus } from '../../types/invoice'
import { generateId } from '../utils/ids'
import { apiFetch } from '../api/fetch'

interface InvoiceState {
  invoices: Invoice[]
  filter: InvoiceFilter
  addInvoice: (invoice: Invoice) => Promise<void>
  localAddInvoice: (invoice: Invoice) => void
  updateInvoice: (id: string, partial: Partial<Invoice>) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>
  duplicateInvoice: (id: string) => void
  createAmendment: (originalId: string, reason: string) => string | null
  setFilter: (filter: Partial<InvoiceFilter>) => void
  resetFilter: () => void
  getInvoiceById: (id: string) => Invoice | undefined
  getFilteredInvoices: () => Invoice[]
  getInvoicesByCustomer: (customerId: string) => Invoice[]
  getTotalsByPeriod: (month: number, year: number) => { revenue: number; gst: number; invoiceCount: number; outstanding: number; overdue: number }
  markAsSent: (id: string) => Promise<void>
  markAsPaid: (id: string, amountPaid: number) => Promise<void>
  bulkUpdateStatus: (ids: string[], status: InvoiceStatus) => Promise<void>
  bulkDelete: (ids: string[]) => Promise<void>
  setInvoices: (invoices: Invoice[]) => void
  init: () => Promise<void>
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

      init: async () => {
        try {
          const res = await apiFetch('/api/invoices')
          if (res.ok) {
            const invoices: Invoice[] = await res.json()
            set((state) => { state.invoices = invoices })
          }
        } catch {
          // keep localStorage data on network failure
        }
      },

      addInvoice: async (invoice) => {
        set((state) => { state.invoices.unshift(invoice) })
        try {
          await apiFetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoice),
          })
        } catch (err) {
          console.error('[invoiceStore] addInvoice failed, rolling back:', err)
          set((state) => { state.invoices = state.invoices.filter((i) => i.id !== invoice.id) })
        }
      },

      localAddInvoice: (invoice) => set((state) => { state.invoices.unshift(invoice) }),

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
            amendedInvoiceId: null,
            amendedInvoiceNumber: null,
            amendmentReason: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          state.invoices.unshift(duplicate)
          apiFetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duplicate),
          }).catch(() => {})
        }),

      createAmendment: (originalId, reason) => {
        const original = get().invoices.find((i) => i.id === originalId)
        if (!original) return null
        const newId = generateId()
        const amendedInvoice: Invoice = {
          ...original,
          id: newId,
          invoiceNumber: original.invoiceNumber + '-AMD',
          status: 'draft' as const,
          amountPaid: 0,
          balanceDue: original.grandTotal,
          irnNumber: null,
          irnStatus: null,
          amendedInvoiceId: original.id,
          amendedInvoiceNumber: original.invoiceNumber,
          amendmentReason: reason,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => {
          const orig = state.invoices.find((i) => i.id === originalId)
          if (orig) orig.status = 'void'
          state.invoices.unshift(amendedInvoice)
        })
        apiFetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(amendedInvoice),
        }).catch(() => {})
        return newId
      },

      updateInvoice: async (id, partial) => {
        const prev = get().invoices.find((i) => i.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const idx = state.invoices.findIndex((i) => i.id === id)
          if (idx !== -1) Object.assign(state.invoices[idx], { ...partial, updatedAt: new Date().toISOString() })
        })
        const updated = get().invoices.find((i) => i.id === id)
        if (!updated) return
        try {
          await apiFetch(`/api/invoices/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          })
        } catch (err) {
          console.error('[invoiceStore] updateInvoice failed, rolling back:', err)
          set((state) => {
            const idx = state.invoices.findIndex((i) => i.id === id)
            if (idx !== -1) state.invoices[idx] = snapshot
          })
        }
      },

      deleteInvoice: async (id) => {
        const prevArr = JSON.parse(JSON.stringify(get().invoices))
        set((state) => { state.invoices = state.invoices.filter((i) => i.id !== id) })
        try {
          await apiFetch(`/api/invoices/${id}`, { method: 'DELETE' })
        } catch (err) {
          console.error('[invoiceStore] deleteInvoice failed, rolling back:', err)
          set((state) => { state.invoices = prevArr })
        }
      },

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
        const outstanding = invs.filter((i) => ['sent', 'overdue'].includes(i.status) && i.balanceDue > 0).reduce((s, i) => s + i.balanceDue, 0)
        const overdue = invs.filter((i) => i.status === 'overdue' && i.balanceDue > 0).reduce((s, i) => s + i.balanceDue, 0)
        return { revenue, gst, invoiceCount: invs.length, outstanding, overdue }
      },

      markAsSent: async (id) => {
        const prev = get().invoices.find((i) => i.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const inv = state.invoices.find((i) => i.id === id)
          if (inv && inv.status === 'draft') inv.status = 'sent'
        })
        const updated = get().invoices.find((i) => i.id === id)
        if (!updated) return
        try {
          await apiFetch(`/api/invoices/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          })
        } catch (err) {
          console.error('[invoiceStore] markAsSent failed, rolling back:', err)
          set((state) => {
            const idx = state.invoices.findIndex((i) => i.id === id)
            if (idx !== -1) state.invoices[idx] = snapshot
          })
        }
      },

      markAsPaid: async (id, amountPaid) => {
        const prev = get().invoices.find((i) => i.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const inv = state.invoices.find((i) => i.id === id)
          if (inv) {
            inv.amountPaid = Math.min(inv.grandTotal, (inv.amountPaid ?? 0) + amountPaid)
            inv.balanceDue = Math.max(0, inv.grandTotal - inv.amountPaid)
            if (inv.balanceDue === 0) inv.status = 'paid'
          }
        })
        const updated = get().invoices.find((i) => i.id === id)
        if (!updated) return
        try {
          await apiFetch(`/api/invoices/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          })
        } catch (err) {
          console.error('[invoiceStore] markAsPaid failed, rolling back:', err)
          set((state) => {
            const idx = state.invoices.findIndex((i) => i.id === id)
            if (idx !== -1) state.invoices[idx] = snapshot
          })
        }
      },

      bulkUpdateStatus: async (ids, status) => {
        const prevArr = JSON.parse(JSON.stringify(get().invoices))
        set((state) => {
          const now = new Date().toISOString()
          for (const inv of state.invoices) {
            if (ids.includes(inv.id)) {
              inv.status = status
              inv.updatedAt = now
            }
          }
        })
        try {
          await apiFetch('/api/invoices/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateStatus', ids, status }),
          })
        } catch (err) {
          console.error('[invoiceStore] bulkUpdateStatus failed, rolling back:', err)
          set((state) => { state.invoices = prevArr })
        }
      },

      bulkDelete: async (ids) => {
        const prevArr = JSON.parse(JSON.stringify(get().invoices))
        set((state) => { state.invoices = state.invoices.filter((i) => !ids.includes(i.id)) })
        try {
          await apiFetch('/api/invoices/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', ids }),
          })
        } catch (err) {
          console.error('[invoiceStore] bulkDelete failed, rolling back:', err)
          set((state) => { state.invoices = prevArr })
        }
      },

      setInvoices: (invoices) => set((state) => { state.invoices = invoices }),
    })),
    { name: 'invozen-invoices' }
  )
)
