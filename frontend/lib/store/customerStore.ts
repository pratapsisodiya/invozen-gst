import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Customer } from '../../types/customer'

interface CustomerState {
  customers: Customer[]
  addCustomer: (customer: Customer) => void
  updateCustomer: (id: string, partial: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  getCustomerById: (id: string) => Customer | undefined
  searchCustomers: (query: string) => Customer[]
  setCustomers: (customers: Customer[]) => void
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    immer((set, get) => ({
      customers: [],
      addCustomer: (customer) =>
        set((state) => { state.customers.push(customer) }),
      updateCustomer: (id, partial) =>
        set((state) => {
          const idx = state.customers.findIndex((c) => c.id === id)
          if (idx !== -1) Object.assign(state.customers[idx], partial)
        }),
      deleteCustomer: (id) =>
        set((state) => {
          state.customers = state.customers.filter((c) => c.id !== id)
        }),
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
