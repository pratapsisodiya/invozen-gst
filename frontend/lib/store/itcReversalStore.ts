import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { ITCReversal, ITCReversalFilter, ITCReversalReason } from '../../types/itcReversal'

interface ITCReversalState {
  reversals: ITCReversal[]
  filter: ITCReversalFilter
  addReversal: (reversal: ITCReversal) => void
  updateReversal: (id: string, partial: Partial<ITCReversal>) => void
  deleteReversal: (id: string) => void
  setReversals: (reversals: ITCReversal[]) => void
  setFilter: (filter: Partial<ITCReversalFilter>) => void
  resetFilter: () => void
  getFilteredReversals: () => ITCReversal[]
  getMonthlyAggregate: (month: number, year: number) => { cgst: number; sgst: number; igst: number; cess: number; total: number; count: number }
  markAsReported: (ids: string[], period: string) => void
  getUnreportedCount: () => number
}

const defaultFilter: ITCReversalFilter = {
  dateFrom: null,
  dateTo: null,
  reason: 'all',
  search: '',
}

export const useITCReversalStore = create<ITCReversalState>()(
  persist(
    immer((set, get) => ({
      reversals: [],
      filter: { ...defaultFilter },

      addReversal: (reversal) => set((state) => { state.reversals.unshift(reversal) }),

      updateReversal: (id, partial) =>
        set((state) => {
          const idx = state.reversals.findIndex((r) => r.id === id)
          if (idx !== -1) Object.assign(state.reversals[idx], { ...partial, updatedAt: new Date().toISOString() })
        }),

      deleteReversal: (id) =>
        set((state) => { state.reversals = state.reversals.filter((r) => r.id !== id) }),

      setReversals: (reversals) => set((state) => { state.reversals = reversals }),

      setFilter: (filter) => set((state) => { Object.assign(state.filter, filter) }),

      resetFilter: () => set((state) => { state.filter = { ...defaultFilter } }),

      getFilteredReversals: () => {
        const { reversals, filter } = get()
        return reversals.filter((r) => {
          if (filter.dateFrom && r.reversalDate < filter.dateFrom) return false
          if (filter.dateTo && r.reversalDate > filter.dateTo) return false
          if (filter.reason !== 'all' && r.reason !== filter.reason) return false
          if (filter.search) {
            const q = filter.search.toLowerCase()
            return (
              r.vendorName.toLowerCase().includes(q) ||
              (r.purchaseInvoiceNumber?.toLowerCase().includes(q) ?? false) ||
              r.reasonNotes.toLowerCase().includes(q)
            )
          }
          return true
        })
      },

      getMonthlyAggregate: (month, year) => {
        const reversals = get().reversals.filter((r) => {
          const d = new Date(r.reversalDate)
          return d.getMonth() + 1 === month && d.getFullYear() === year
        })
        return {
          cgst: Math.round(reversals.reduce((s, r) => s + r.cgstReversed, 0) * 100) / 100,
          sgst: Math.round(reversals.reduce((s, r) => s + r.sgstReversed, 0) * 100) / 100,
          igst: Math.round(reversals.reduce((s, r) => s + r.igstReversed, 0) * 100) / 100,
          cess: Math.round(reversals.reduce((s, r) => s + r.cessReversed, 0) * 100) / 100,
          total: Math.round(reversals.reduce((s, r) => s + r.totalReversed, 0) * 100) / 100,
          count: reversals.length,
        }
      },

      markAsReported: (ids, period) =>
        set((state) => {
          for (const r of state.reversals) {
            if (ids.includes(r.id)) {
              r.isReported = true
              r.gstr3bPeriod = period
              r.updatedAt = new Date().toISOString()
            }
          }
        }),

      getUnreportedCount: () => get().reversals.filter((r) => !r.isReported).length,
    })),
    { name: 'invozen-itc-reversals' }
  )
)
