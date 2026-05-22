import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Vendor, PurchaseInvoice, PurchaseFilter } from '../../types/purchase'
import type { ITCReversalReason } from '../../types/itcReversal'
import { apiFetch } from '../api/fetch'
import { generateId } from '../utils/ids'

interface PurchaseState {
  vendors: Vendor[]
  purchases: PurchaseInvoice[]
  filter: PurchaseFilter
  addVendor: (vendor: Vendor) => Promise<void>
  updateVendor: (id: string, partial: Partial<Vendor>) => Promise<void>
  deleteVendor: (id: string) => Promise<void>
  setVendors: (vendors: Vendor[]) => void
  getVendorById: (id: string) => Vendor | undefined
  searchVendors: (query: string) => Vendor[]
  addPurchase: (purchase: PurchaseInvoice) => Promise<void>
  updatePurchase: (id: string, partial: Partial<PurchaseInvoice>) => Promise<void>
  deletePurchase: (id: string) => Promise<void>
  setPurchases: (purchases: PurchaseInvoice[]) => void
  claimItc: (id: string) => Promise<void>
  reverseItc: (id: string, reason: ITCReversalReason, notes: string) => void
  setFilter: (filter: Partial<PurchaseFilter>) => void
  resetFilter: () => void
  getItcSummary: () => { available: number; claimed: number; pending: number; reversed: number }
  getITCByPeriod: (month: number, year: number) => { igst: number; cgst: number; sgst: number; total: number; count: number }
  getPurchasesByVendor: (vendorId: string) => PurchaseInvoice[]
  initVendors: () => Promise<void>
  initPurchases: () => Promise<void>
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

      initVendors: async () => {
        try {
          const res = await apiFetch('/api/vendors')
          if (res.ok) {
            const vendors: Vendor[] = await res.json()
            set((state) => { state.vendors = vendors })
          }
        } catch {
          // keep localStorage data on network failure
        }
      },

      initPurchases: async () => {
        try {
          const res = await apiFetch('/api/purchases')
          if (res.ok) {
            const purchases: PurchaseInvoice[] = await res.json()
            set((state) => { state.purchases = purchases })
          }
        } catch {
          // keep localStorage data on network failure
        }
      },

      addVendor: async (vendor) => {
        set((state) => { state.vendors.push(vendor) })
        try {
          await apiFetch('/api/vendors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vendor),
          })
        } catch {
          // already in local state
        }
      },

      updateVendor: async (id, partial) => {
        set((state) => {
          const idx = state.vendors.findIndex((v) => v.id === id)
          if (idx !== -1) Object.assign(state.vendors[idx], partial)
        })
        try {
          await apiFetch(`/api/vendors/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partial),
          })
        } catch {
          // already in local state
        }
      },

      deleteVendor: async (id) => {
        set((state) => { state.vendors = state.vendors.filter((v) => v.id !== id) })
        try {
          await apiFetch(`/api/vendors/${id}`, { method: 'DELETE' })
        } catch {
          // already removed locally
        }
      },

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

      addPurchase: async (purchase) => {
        set((state) => { state.purchases.unshift(purchase) })
        try {
          await apiFetch('/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(purchase),
          })
        } catch {
          // already in local state
        }
      },

      updatePurchase: async (id, partial) => {
        set((state) => {
          const idx = state.purchases.findIndex((p) => p.id === id)
          if (idx !== -1) Object.assign(state.purchases[idx], { ...partial, updatedAt: new Date().toISOString() })
        })
        try {
          await apiFetch(`/api/purchases/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partial),
          })
        } catch {
          // already in local state
        }
      },

      deletePurchase: async (id) => {
        set((state) => { state.purchases = state.purchases.filter((p) => p.id !== id) })
        try {
          await apiFetch(`/api/purchases/${id}`, { method: 'DELETE' })
        } catch {
          // already removed locally
        }
      },

      setPurchases: (purchases) => set((state) => { state.purchases = purchases }),

      reverseItc: (id, reason, notes) => {
        const purchase = get().purchases.find((p) => p.id === id)
        if (!purchase) return

        // Mark the purchase as reversed
        set((state) => {
          const p = state.purchases.find((p) => p.id === id)
          if (p) {
            p.itcStatus = 'reversed'
            p.updatedAt = new Date().toISOString()
          }
        })

        // Calculate amounts reversed per tax head
        let cgst = 0, sgst = 0, igst = 0
        for (const item of purchase.lineItems) {
          if (item.itcEligible) {
            cgst += item.cgst
            sgst += item.sgst
            igst += item.igst
          }
        }
        const round2 = (n: number) => Math.round(n * 100) / 100

        // Create reversal record in itcReversalStore
        const { useITCReversalStore } = require('./itcReversalStore') as { useITCReversalStore: { getState: () => { addReversal: (r: unknown) => void } } }
        useITCReversalStore.getState().addReversal({
          id: generateId(),
          reversalDate: new Date().toISOString().split('T')[0],
          purchaseId: id,
          purchaseInvoiceNumber: purchase.vendorInvoiceNumber,
          vendorName: purchase.vendorSnapshot.name,
          vendorGstin: purchase.vendorSnapshot.gstin || null,
          originalInvoiceDate: purchase.invoiceDate,
          reason,
          reasonNotes: notes,
          cgstReversed: round2(cgst),
          sgstReversed: round2(sgst),
          igstReversed: round2(igst),
          cessReversed: 0,
          totalReversed: round2(cgst + sgst + igst),
          gstr3bPeriod: null,
          isReported: false,
          notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      },

      claimItc: async (id) => {
        set((state) => {
          const p = state.purchases.find((p) => p.id === id)
          if (p) {
            p.itcStatus = 'claimed'
            p.status = 'claimed'
            p.itcClaimed = p.itcAvailable
            p.updatedAt = new Date().toISOString()
          }
        })
        try {
          await apiFetch(`/api/purchases/${id}/claim-itc`, { method: 'POST' })
        } catch {
          // already updated locally
        }
      },

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

      getITCByPeriod: (month, year) => {
        const purchases = get().purchases.filter((p) => {
          const d = new Date(p.invoiceDate)
          return d.getMonth() + 1 === month && d.getFullYear() === year &&
            (p.itcStatus === 'eligible' || p.itcStatus === 'claimed')
        })
        let igst = 0, cgst = 0, sgst = 0
        for (const p of purchases) {
          for (const item of p.lineItems) {
            if (!item.itcEligible) continue
            igst += item.igst
            cgst += item.cgst
            sgst += item.sgst
          }
        }
        const round2 = (n: number) => Math.round(n * 100) / 100
        return { igst: round2(igst), cgst: round2(cgst), sgst: round2(sgst), total: round2(igst + cgst + sgst), count: purchases.length }
      },

      getPurchasesByVendor: (vendorId) =>
        get().purchases.filter((p) => p.vendorId === vendorId),
    })),
    { name: 'invozen-purchases' }
  )
)
