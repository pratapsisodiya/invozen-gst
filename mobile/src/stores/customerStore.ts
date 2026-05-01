import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Customer } from '@/lib/types/customer'

interface CustomerState {
  customers: Customer[]
  setCustomers: (customers: Customer[]) => void
  addCustomer: (customer: Customer) => void
  updateCustomer: (id: string, updates: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  getCustomerById: (id: string) => Customer | undefined
  searchCustomers: (query: string) => Customer[]
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: [],

      setCustomers: (customers) => set({ customers }),

      addCustomer: (customer) =>
        set((state) => ({ customers: [customer, ...state.customers] })),

      updateCustomer: (id, updates) =>
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCustomer: (id) =>
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        })),

      getCustomerById: (id) => {
        return get().customers.find((c) => c.id === id)
      },

      searchCustomers: (query) => {
        const { customers } = get()
        if (!query) return customers

        const search = query.toLowerCase()
        return customers.filter(
          (c) =>
            c.name.toLowerCase().includes(search) ||
            c.gstin?.toLowerCase().includes(search) ||
            c.phone?.toLowerCase().includes(search) ||
            c.email?.toLowerCase().includes(search)
        )
      },
    }),
    {
      name: 'invozen-customers',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
