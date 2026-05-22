import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { DeliveryChallan, ChallanFilter, ChallanStatus } from '../../types/challan'

interface ChallanState {
  challans: DeliveryChallan[]
  filter: ChallanFilter
  addChallan: (challan: DeliveryChallan) => void
  updateChallan: (id: string, partial: Partial<DeliveryChallan>) => void
  deleteChallan: (id: string) => void
  setChallans: (challans: DeliveryChallan[]) => void
  setFilter: (filter: Partial<ChallanFilter>) => void
  resetFilter: () => void
  issueChallan: (id: string) => void
  markReturned: (id: string, returnDate?: string) => void
  convertToInvoice: (id: string, invoiceId: string, invoiceNumber: string) => void
  getFilteredChallans: () => DeliveryChallan[]
  getChallanById: (id: string) => DeliveryChallan | undefined
  getOverdueReturns: () => DeliveryChallan[]
}

const defaultFilter: ChallanFilter = {
  status: 'all',
  challanType: 'all',
  dateFrom: null,
  dateTo: null,
  search: '',
}

export const useChallanStore = create<ChallanState>()(
  persist(
    immer((set, get) => ({
      challans: [],
      filter: { ...defaultFilter },

      addChallan: (challan) => set((state) => { state.challans.unshift(challan) }),

      updateChallan: (id, partial) =>
        set((state) => {
          const idx = state.challans.findIndex((c) => c.id === id)
          if (idx !== -1) Object.assign(state.challans[idx], { ...partial, updatedAt: new Date().toISOString() })
        }),

      deleteChallan: (id) =>
        set((state) => { state.challans = state.challans.filter((c) => c.id !== id) }),

      setChallans: (challans) => set((state) => { state.challans = challans }),

      setFilter: (filter) => set((state) => { Object.assign(state.filter, filter) }),

      resetFilter: () => set((state) => { state.filter = { ...defaultFilter } }),

      issueChallan: (id) =>
        set((state) => {
          const c = state.challans.find((c) => c.id === id)
          if (c && c.status === 'draft') {
            c.status = 'issued'
            c.updatedAt = new Date().toISOString()
          }
        }),

      markReturned: (id, returnDate) =>
        set((state) => {
          const c = state.challans.find((c) => c.id === id)
          if (c && c.status === 'issued') {
            c.status = 'returned'
            c.actualReturnDate = returnDate || new Date().toISOString().split('T')[0]
            c.updatedAt = new Date().toISOString()
          }
        }),

      convertToInvoice: (id, invoiceId, invoiceNumber) =>
        set((state) => {
          const c = state.challans.find((c) => c.id === id)
          if (c && (c.status === 'issued' || c.status === 'draft')) {
            c.status = 'converted'
            c.convertedToInvoiceId = invoiceId
            c.convertedToInvoiceNumber = invoiceNumber
            c.updatedAt = new Date().toISOString()
          }
        }),

      getFilteredChallans: () => {
        const { challans, filter } = get()
        return challans.filter((c) => {
          if (filter.status !== 'all' && c.status !== filter.status) return false
          if (filter.challanType !== 'all' && c.challanType !== filter.challanType) return false
          if (filter.dateFrom && c.challanDate < filter.dateFrom) return false
          if (filter.dateTo && c.challanDate > filter.dateTo) return false
          if (filter.search) {
            const q = filter.search.toLowerCase()
            return (
              c.challanNumber.toLowerCase().includes(q) ||
              c.toName.toLowerCase().includes(q) ||
              c.reasonForTransport.toLowerCase().includes(q)
            )
          }
          return true
        })
      },

      getChallanById: (id) => get().challans.find((c) => c.id === id),

      getOverdueReturns: () => {
        const today = new Date().toISOString().split('T')[0]
        return get().challans.filter(
          (c) => c.status === 'issued' && c.expectedReturnDate && c.expectedReturnDate < today
        )
      },
    })),
    { name: 'invozen-challans' }
  )
)
