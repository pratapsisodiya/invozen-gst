import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface ReminderRecord {
  id: string
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  phone: string
  sentAt: string
  amount: number
  daysOverdue: number
  channel: 'whatsapp' | 'email'
}

interface ReminderHistoryState {
  history: ReminderRecord[]
  addRecord: (record: ReminderRecord) => void
  getByInvoice: (invoiceId: string) => ReminderRecord[]
  getByCustomer: (customerId: string) => ReminderRecord[]
  getRecentCount: (days: number) => number
  getReminderCountForInvoice: (invoiceId: string) => number
}

export const useReminderHistoryStore = create<ReminderHistoryState>()(
  persist(
    immer((set, get) => ({
      history: [],

      addRecord: (record) => set((state) => { state.history.unshift(record) }),

      getByInvoice: (invoiceId) => get().history.filter((r) => r.invoiceId === invoiceId),

      getByCustomer: (customerId) => get().history.filter((r) => r.customerId === customerId),

      getRecentCount: (days) => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        const cutoffStr = cutoff.toISOString()
        return get().history.filter((r) => r.sentAt >= cutoffStr).length
      },

      getReminderCountForInvoice: (invoiceId) =>
        get().history.filter((r) => r.invoiceId === invoiceId).length,
    })),
    { name: 'invozen-reminder-history' }
  )
)
