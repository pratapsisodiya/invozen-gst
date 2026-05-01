import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Vendor, PurchaseInvoice, PurchaseFilter, ItcStatus } from '../../types/purchase'

interface PurchaseState {
  vendors: Vendor[]
  purchases: PurchaseInvoice[]
  filter: PurchaseFilter
  addVendor: (vendor: Vendor) => void
  updateVendor: (id: string, partial: Partial<Vendor>) => void
  deleteVendor: (id: string) => void
  setVendors: (vendors: Vendor[]) => void
  getVendorById: (id: string) => Vendor | undefined
  searchVendors: (query: string) => Vendor[]
  addPurchase: (purchase: PurchaseInvoice) => void
  updatePurchase: (id: string, partial: Partial<PurchaseInvoice>) => void
  deletePurchase: (id: string) => void
  setPurchases: (purchases: PurchaseInvoice[]) => void
  claimItc: (id: string) => void
  setFilter: (filter: Partial<PurchaseFilter>) => void
  resetFilter: () => void
  getItcSummary: () => { available: number; claimed: number; pending: number; reversed: number }
  getPurchasesByVendor: (vendorId: string) => PurchaseInvoice[]
}

const defaultFilter: PurchaseFilter = {
  status: 'all',
  vendorId: null,
  dateFrom: null,
  dateTo: null,
  itcStatus: 'all',
  search: '',
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    immer((set, get) => ({
      vendors: [],
      purchases: [],
      filter: defaultFilter,

      addVendor: (vendor) => set((state) => { state.vendors.push(vendor) }),
      updateVendor: (id, partial) =>
        set((state) => {
          const idx = state.vendors.findIndex((v) => v.id === id)
          if (idx !== -1) Object.assign(state.vendors[idx], partial)
        }),
      deleteVendor: (id) =>
        set((state) => { state.vendors = state.vendors.filter((v) => v.id !== id) }),
      setVendors: (vendors) => set((state) => { state.vendors = vendors }),
      getVendorById: (id) => get().vendors.find((v) => v.id === id),
      searchVendors: (query) => {
        const q = query.toLowerCase()
        return get().vendors.filter(
          (v) => v.name.toLowerCase().includes(q) ||
            v.businessName?.toLowerCase().includes(q) ||
            v.gstin?.toLowerCase().includes(q)
        )
      },

      addPurchase: (purchase) => set((state) => { state.purchases.unshift(purchase) }),
      updatePurchase: (id, partial) =>
        set((state) => {
          const idx = state.purchases.findIndex((p) => p.id === id)
          if (idx !== -1) Object.assign(state.purchases[idx], { ...partial, updatedAt: new Date().toISOString() })
        }),
      deletePurchase: (id) =>
        set((state) => { state.purchases = state.purchases.filter((p) => p.id !== id) }),
      setPurchases: (purchases) => set((state) => { state.purchases = purchases }),
      claimItc: (id) =>
        set((state) => {
          const p = state.purchases.find((p) => p.id === id)
          if (p) {
            p.itcStatus = 'claimed'
            p.status = 'claimed'
            p.itcClaimed = p.itcAvailable
            p.updatedAt = new Date().toISOString()
          }
        }),

      setFilter: (filter) => set((state) => { Object.assign(state.filter, filter) }),
      resetFilter: () => set((state) => { state.filter = defaultFilter }),

      getItcSummary: () => {
        const { purchases } = get()
        const available = purchases
          .filter((p) => p.itcStatus === 'eligible' || p.itcStatus === 'claimed')
          .reduce((s, p) => s + p.itcAvailable, 0)
        const claimed = purchases
          .filter((p) => p.itcStatus === 'claimed')
          .reduce((s, p) => s + p.itcClaimed, 0)
        const pending = purchases
          .filter((p) => p.itcStatus === 'eligible')
          .reduce((s, p) => s + p.itcAvailable, 0)
        const reversed = purchases
          .filter((p) => p.itcStatus === 'reversed')
          .reduce((s, p) => s + p.itcAvailable, 0)
        return { available, claimed, pending, reversed }
      },

      getPurchasesByVendor: (vendorId) =>
        get().purchases.filter((p) => p.vendorId === vendorId),
    })),
    { name: 'invozen-purchases' }
  )
)
