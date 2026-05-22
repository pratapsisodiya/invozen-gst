import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Payment } from '../../types/payment'
import { apiFetch } from '../api/fetch'
import { useNotificationStore } from './notificationStore'

interface PaymentState {
  payments: Payment[]
  addPayment: (payment: Payment) => Promise<void>
  deletePayment: (id: string) => Promise<void>
  markAdvanceUsed: (advanceId: string, invoiceId: string) => void
  getPaymentsByInvoice: (invoiceId: string) => Payment[]
  getUnallocatedAdvances: (customerId: string) => Payment[]
  getTotalCollected: (month: number, year: number) => number
  setPayments: (payments: Payment[]) => void
  init: () => Promise<void>
}

export const usePaymentStore = create<PaymentState>()(
  persist(
    immer((set, get) => ({
      payments: [],

      init: async () => {
        try {
          const res = await apiFetch('/api/payments')
          if (res.ok) {
            const payments: Payment[] = await res.json()
            set((state) => { state.payments = payments })
          }
        } catch {
          // keep localStorage data on network failure
        }
      },

      addPayment: async (payment) => {
        set((state) => { state.payments.unshift(payment) })
        useNotificationStore.getState().addNotification({
          type: 'payment_received',
          title: 'Payment Received',
          message: `₹${payment.amount.toLocaleString('en-IN')} recorded${payment.invoiceId ? ' for invoice' : ' (advance)'}`,
          linkUrl: payment.invoiceId ? `/invoices/${payment.invoiceId}` : null,
        })
        try {
          await apiFetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payment),
          })
        } catch {
          // already in local state
        }
      },

      deletePayment: async (id) => {
        set((state) => { state.payments = state.payments.filter((p) => p.id !== id) })
        try {
          await apiFetch(`/api/payments/${id}`, { method: 'DELETE' })
        } catch {
          // already removed locally
        }
      },

      markAdvanceUsed: (advanceId, invoiceId) => {
        set((state) => {
          const adv = state.payments.find((p) => p.id === advanceId)
          if (adv) adv.advanceAdjustedInvoiceId = invoiceId
        })
      },

      getPaymentsByInvoice: (invoiceId) =>
        get().payments.filter((p) => p.invoiceId === invoiceId),

      getUnallocatedAdvances: (customerId) =>
        get().payments.filter(
          (p) => p.customerId === customerId && p.isAdvance && !p.advanceAdjustedInvoiceId
        ),

      getTotalCollected: (month, year) =>
        get().payments
          .filter((p) => {
            const d = new Date(p.paymentDate)
            return d.getMonth() + 1 === month && d.getFullYear() === year && !p.isAdvance
          })
          .reduce((s, p) => s + p.amount, 0),

      setPayments: (payments) => set((state) => { state.payments = payments }),
    })),
    { name: 'invozen-payments' }
  )
)
