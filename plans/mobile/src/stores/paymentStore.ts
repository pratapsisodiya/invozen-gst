import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Payment } from '@/lib/types/payment'

interface PaymentState {
  payments: Payment[]
  setPayments: (payments: Payment[]) => void
  addPayment: (payment: Payment) => void
  updatePayment: (id: string, updates: Partial<Payment>) => void
  deletePayment: (id: string) => void
  getPaymentsByInvoice: (invoiceId: string) => Payment[]
}

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set, get) => ({
      payments: [],

      setPayments: (payments) => set({ payments }),

      addPayment: (payment) =>
        set((state) => ({ payments: [payment, ...state.payments] })),

      updatePayment: (id, updates) =>
        set((state) => ({
          payments: state.payments.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      deletePayment: (id) =>
        set((state) => ({
          payments: state.payments.filter((p) => p.id !== id),
        })),

      getPaymentsByInvoice: (invoiceId) => {
        return get().payments.filter((p) => p.invoiceId === invoiceId)
      },
    }),
    {
      name: 'invozen-payments',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
