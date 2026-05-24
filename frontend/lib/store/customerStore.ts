import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Customer } from '../../types/customer'
import { apiFetch } from '../api/fetch'

interface CustomerState {
  customers: Customer[]
  addCustomer: (customer: Customer) => Promise<void>
  updateCustomer: (id: string, partial: Partial<Customer>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  getCustomerById: (id: string) => Customer | undefined
  searchCustomers: (query: string) => Customer[]
  setCustomers: (customers: Customer[]) => void
  init: () => Promise<void>
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    immer((set, get) => ({
      customers: [],

      init: async () => {
        try {
          const res = await apiFetch('/api/customers')
          if (res.ok) {
            const customers: Customer[] = await res.json()
            set((state) => { state.customers = customers })
          }
        } catch {
          // keep localStorage data on network failure
        }
      },

      addCustomer: async (customer) => {
        set((state) => { state.customers.push(customer) })
        try {
          await apiFetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer),
          })
        } catch (err) {
          console.error('[customerStore] addCustomer failed, rolling back:', err)
          set((state) => { state.customers = state.customers.filter((c) => c.id !== customer.id) })
        }
      },

      updateCustomer: async (id, partial) => {
        const prev = get().customers.find((c) => c.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const idx = state.customers.findIndex((c) => c.id === id)
          if (idx !== -1) Object.assign(state.customers[idx], partial)
        })
        try {
          await apiFetch(`/api/customers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partial),
          })
        } catch (err) {
          console.error('[customerStore] updateCustomer failed, rolling back:', err)
          set((state) => {
            const idx = state.customers.findIndex((c) => c.id === id)
            if (idx !== -1) state.customers[idx] = snapshot
          })
        }
      },

      deleteCustomer: async (id) => {
        const prevArr = JSON.parse(JSON.stringify(get().customers))
        set((state) => { state.customers = state.customers.filter((c) => c.id !== id) })
        try {
          await apiFetch(`/api/customers/${id}`, { method: 'DELETE' })
        } catch (err) {
          console.error('[customerStore] deleteCustomer failed, rolling back:', err)
          set((state) => { state.customers = prevArr })
        }
      },

      getCustomerById: (id) => get().customers.find((c) => c.id === id),

      searchCustomers: (query) => {
        const q = query.toLowerCase()
        return get().customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.businessName?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.gstin?.toLowerCase().includes(q)
        )
      },

      setCustomers: (customers) => set((state) => { state.customers = customers }),
    })),
    { name: 'invozen-customers' }
  )
)
