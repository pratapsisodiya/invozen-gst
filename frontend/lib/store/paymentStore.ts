import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Payment } from '../../types/payment'

interface PaymentState {
  payments: Payment[]
  addPayment: (payment: Payment) => void
  getPaymentsByInvoice: (invoiceId: string) => Payment[]
  getTotalCollected: (month: number, year: number) => number
  setPayments: (payments: Payment[]) => void
}

export const usePaymentStore = create<PaymentState>()(
  persist(
    immer((set, get) => ({
      payments: [],
      addPayment: (payment) => set((state) => { state.payments.unshift(payment) }),
      getPaymentsByInvoice: (invoiceId) =>
        get().payments.filter((p) => p.invoiceId === invoiceId),
      getTotalCollected: (month, year) =>
        get().payments
          .filter((p) => {
            const d = new Date(p.paymentDate)
            return d.getMonth() + 1 === month && d.getFullYear() === year
          })
          .reduce((s, p) => s + p.amount, 0),
      setPayments: (payments) => set((state) => { state.payments = payments }),
    })),
    { name: 'invozen-payments' }
  )
)
