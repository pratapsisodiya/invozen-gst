import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Quotation } from '../../types/quotation'
import type { Invoice } from '../../types/invoice'
import { useInvoiceStore } from './invoiceStore'
import { apiFetch } from '../api/fetch'

interface QuotationState {
  quotations: Quotation[]
  addQuotation: (quotation: Quotation) => Promise<void>
  updateQuotation: (id: string, partial: Partial<Quotation>) => Promise<void>
  deleteQuotation: (id: string) => Promise<void>
  setQuotations: (quotations: Quotation[]) => void
  markSent: (id: string) => Promise<void>
  markAccepted: (id: string) => Promise<void>
  markRejected: (id: string) => Promise<void>
  convertToInvoice: (id: string) => Promise<string | null>
  expireOverdue: () => number
  init: () => Promise<void>
}

export const useQuotationStore = create<QuotationState>()(
  persist(
    immer((set, get) => ({
      quotations: [],

      init: async () => {
        try {
          const res = await apiFetch('/api/quotations')
          if (res.ok) {
            const quotations: Quotation[] = await res.json()
            set((state) => { state.quotations = quotations })
          }
        } catch { /* keep localStorage data on network failure */ }
      },

      addQuotation: async (quotation) => {
        set((state) => { state.quotations.unshift(quotation) })
        try {
          const res = await apiFetch('/api/quotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quotation),
          })
          if (!res.ok) set((state) => { state.quotations = state.quotations.filter((q) => q.id !== quotation.id) })
        } catch {
          set((state) => { state.quotations = state.quotations.filter((q) => q.id !== quotation.id) })
        }
      },

      updateQuotation: async (id, partial) => {
        const prev = get().quotations.find((q) => q.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const idx = state.quotations.findIndex((q) => q.id === id)
          if (idx !== -1) Object.assign(state.quotations[idx], { ...partial, updatedAt: new Date().toISOString() })
        })
        try {
          const res = await apiFetch(`/api/quotations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partial),
          })
          if (!res.ok) set((state) => {
            const idx = state.quotations.findIndex((q) => q.id === id)
            if (idx !== -1) state.quotations[idx] = snapshot
          })
        } catch {
          set((state) => {
            const idx = state.quotations.findIndex((q) => q.id === id)
            if (idx !== -1) state.quotations[idx] = snapshot
          })
        }
      },

      deleteQuotation: async (id) => {
        const snapshot = JSON.parse(JSON.stringify(get().quotations))
        set((state) => { state.quotations = state.quotations.filter((q) => q.id !== id) })
        try {
          const res = await apiFetch(`/api/quotations/${id}`, { method: 'DELETE' })
          if (!res.ok) set((state) => { state.quotations = snapshot })
        } catch {
          set((state) => { state.quotations = snapshot })
        }
      },

      setQuotations: (quotations) => set((state) => { state.quotations = quotations }),

      markSent: async (id) => {
        const prev = get().quotations.find((q) => q.id === id)
        if (!prev || prev.status !== 'draft') return
        set((state) => {
          const q = state.quotations.find((q) => q.id === id)
          if (q) { q.status = 'sent'; q.updatedAt = new Date().toISOString() }
        })
        try {
          await apiFetch(`/api/quotations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'sent' }),
          })
        } catch { /* optimistic state kept */ }
      },

      markAccepted: async (id) => {
        set((state) => {
          const q = state.quotations.find((q) => q.id === id)
          if (q) { q.status = 'accepted'; q.updatedAt = new Date().toISOString() }
        })
        try {
          await apiFetch(`/api/quotations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'accepted' }),
          })
        } catch { /* optimistic state kept */ }
      },

      markRejected: async (id) => {
        set((state) => {
          const q = state.quotations.find((q) => q.id === id)
          if (q) { q.status = 'rejected'; q.updatedAt = new Date().toISOString() }
        })
        try {
          await apiFetch(`/api/quotations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected' }),
          })
        } catch { /* optimistic state kept */ }
      },

      convertToInvoice: async (id) => {
        const q = get().quotations.find((q) => q.id === id)
        if (!q || q.status === 'converted') return null

        try {
          const res = await apiFetch(`/api/quotations/${id}/convert`, { method: 'POST' })
          if (!res.ok) return null
          const invoice: Invoice = await res.json()
          useInvoiceStore.getState().localAddInvoice(invoice)
          set((state) => {
            const qn = state.quotations.find((qn) => qn.id === id)
            if (qn) {
              qn.status = 'converted'
              qn.convertedToInvoiceId = invoice.id
              qn.convertedToInvoiceNumber = invoice.invoiceNumber
              qn.updatedAt = new Date().toISOString()
            }
          })
          return invoice.id
        } catch {
          return null
        }
      },

      expireOverdue: () => {
        const today = new Date().toISOString().split('T')[0]
        let count = 0
        set((state) => {
          for (const q of state.quotations) {
            if ((q.status === 'draft' || q.status === 'sent') && q.validUntil < today) {
              q.status = 'expired'
              q.updatedAt = new Date().toISOString()
              count++
            }
          }
        })
        return count
      },
    })),
    { name: 'invozen-quotations' }
  )
)
