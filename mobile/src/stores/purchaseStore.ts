import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Purchase, Vendor } from '@/lib/types/purchase'

interface PurchaseState {
  purchases: Purchase[]
  vendors: Vendor[]
  setPurchases: (purchases: Purchase[]) => void
  setVendors: (vendors: Vendor[]) => void
  addPurchase: (purchase: Purchase) => void
  updatePurchase: (id: string, updates: Partial<Purchase>) => void
  deletePurchase: (id: string) => void
  addVendor: (vendor: Vendor) => void
  updateVendor: (id: string, updates: Partial<Vendor>) => void
  deleteVendor: (id: string) => void
  getVendorById: (id: string) => Vendor | undefined
  getItcSummary: () => { available: number; claimed: number; pending: number; reversed: number }
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      purchases: [],
      vendors: [],

      setPurchases: (purchases) => set({ purchases }),
      setVendors: (vendors) => set({ vendors }),

      addPurchase: (purchase) =>
        set((state) => ({ purchases: [purchase, ...state.purchases] })),

      updatePurchase: (id, updates) =>
        set((state) => ({
          purchases: state.purchases.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      deletePurchase: (id) =>
        set((state) => ({
          purchases: state.purchases.filter((p) => p.id !== id),
        })),

      addVendor: (vendor) =>
        set((state) => ({ vendors: [vendor, ...state.vendors] })),

      updateVendor: (id, updates) =>
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          ),
        })),

      deleteVendor: (id) =>
        set((state) => ({
          vendors: state.vendors.filter((v) => v.id !== id),
        })),

      getVendorById: (id) => {
        return get().vendors.find((v) => v.id === id)
      },

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
    }),
    {
      name: 'invozen-purchases',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
