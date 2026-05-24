import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { CreditNote, DebitNote } from '../../types/creditNote'
import { apiFetch } from '../api/fetch'

interface CreditNoteState {
  creditNotes: CreditNote[]
  debitNotes: DebitNote[]
  addCreditNote: (cn: CreditNote) => Promise<void>
  updateCreditNote: (id: string, partial: Partial<CreditNote>) => Promise<void>
  deleteCreditNote: (id: string) => Promise<void>
  setCreditNotes: (cns: CreditNote[]) => void
  approveCreditNote: (id: string) => Promise<void>
  addDebitNote: (dn: DebitNote) => Promise<void>
  updateDebitNote: (id: string, partial: Partial<DebitNote>) => Promise<void>
  deleteDebitNote: (id: string) => Promise<void>
  setDebitNotes: (dns: DebitNote[]) => void
  approveDebitNote: (id: string) => Promise<void>
  init: () => Promise<void>
}

export const useCreditNoteStore = create<CreditNoteState>()(
  persist(
    immer((set, get) => ({
      creditNotes: [],
      debitNotes: [],

      init: async () => {
        try {
          const [cnRes, dnRes] = await Promise.all([
            apiFetch('/api/credit-notes'),
            apiFetch('/api/debit-notes'),
          ])
          if (cnRes.ok) {
            const creditNotes: CreditNote[] = await cnRes.json()
            set((state) => { state.creditNotes = creditNotes })
          }
          if (dnRes.ok) {
            const debitNotes: DebitNote[] = await dnRes.json()
            set((state) => { state.debitNotes = debitNotes })
          }
        } catch { /* keep localStorage data on network failure */ }
      },

      addCreditNote: async (cn) => {
        set((state) => { state.creditNotes.unshift(cn) })
        try {
          const res = await apiFetch('/api/credit-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cn),
          })
          if (!res.ok) set((state) => { state.creditNotes = state.creditNotes.filter((c) => c.id !== cn.id) })
        } catch {
          set((state) => { state.creditNotes = state.creditNotes.filter((c) => c.id !== cn.id) })
        }
      },

      updateCreditNote: async (id, partial) => {
        const prev = get().creditNotes.find((c) => c.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const idx = state.creditNotes.findIndex((c) => c.id === id)
          if (idx !== -1) Object.assign(state.creditNotes[idx], { ...partial, updatedAt: new Date().toISOString() })
        })
        try {
          const res = await apiFetch(`/api/credit-notes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partial),
          })
          if (!res.ok) set((state) => {
            const idx = state.creditNotes.findIndex((c) => c.id === id)
            if (idx !== -1) state.creditNotes[idx] = snapshot
          })
        } catch {
          set((state) => {
            const idx = state.creditNotes.findIndex((c) => c.id === id)
            if (idx !== -1) state.creditNotes[idx] = snapshot
          })
        }
      },

      deleteCreditNote: async (id) => {
        const snapshot = JSON.parse(JSON.stringify(get().creditNotes))
        set((state) => { state.creditNotes = state.creditNotes.filter((c) => c.id !== id) })
        try {
          const res = await apiFetch(`/api/credit-notes/${id}`, { method: 'DELETE' })
          if (!res.ok) set((state) => { state.creditNotes = snapshot })
        } catch {
          set((state) => { state.creditNotes = snapshot })
        }
      },

      setCreditNotes: (cns) => set((state) => { state.creditNotes = cns }),

      approveCreditNote: async (id) => {
        const prev = get().creditNotes.find((c) => c.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const cn = state.creditNotes.find((c) => c.id === id)
          if (cn) { cn.status = 'approved'; cn.updatedAt = new Date().toISOString() }
        })
        try {
          const res = await apiFetch(`/api/credit-notes/${id}/approve`, { method: 'POST' })
          if (!res.ok) set((state) => {
            const idx = state.creditNotes.findIndex((c) => c.id === id)
            if (idx !== -1) state.creditNotes[idx] = snapshot
          })
        } catch {
          set((state) => {
            const idx = state.creditNotes.findIndex((c) => c.id === id)
            if (idx !== -1) state.creditNotes[idx] = snapshot
          })
        }
      },

      addDebitNote: async (dn) => {
        set((state) => { state.debitNotes.unshift(dn) })
        try {
          const res = await apiFetch('/api/debit-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dn),
          })
          if (!res.ok) set((state) => { state.debitNotes = state.debitNotes.filter((d) => d.id !== dn.id) })
        } catch {
          set((state) => { state.debitNotes = state.debitNotes.filter((d) => d.id !== dn.id) })
        }
      },

      updateDebitNote: async (id, partial) => {
        const prev = get().debitNotes.find((d) => d.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const idx = state.debitNotes.findIndex((d) => d.id === id)
          if (idx !== -1) Object.assign(state.debitNotes[idx], { ...partial, updatedAt: new Date().toISOString() })
        })
        try {
          const res = await apiFetch(`/api/debit-notes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partial),
          })
          if (!res.ok) set((state) => {
            const idx = state.debitNotes.findIndex((d) => d.id === id)
            if (idx !== -1) state.debitNotes[idx] = snapshot
          })
        } catch {
          set((state) => {
            const idx = state.debitNotes.findIndex((d) => d.id === id)
            if (idx !== -1) state.debitNotes[idx] = snapshot
          })
        }
      },

      deleteDebitNote: async (id) => {
        const snapshot = JSON.parse(JSON.stringify(get().debitNotes))
        set((state) => { state.debitNotes = state.debitNotes.filter((d) => d.id !== id) })
        try {
          const res = await apiFetch(`/api/debit-notes/${id}`, { method: 'DELETE' })
          if (!res.ok) set((state) => { state.debitNotes = snapshot })
        } catch {
          set((state) => { state.debitNotes = snapshot })
        }
      },

      setDebitNotes: (dns) => set((state) => { state.debitNotes = dns }),

      approveDebitNote: async (id) => {
        const prev = get().debitNotes.find((d) => d.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const dn = state.debitNotes.find((d) => d.id === id)
          if (dn) { dn.status = 'approved'; dn.updatedAt = new Date().toISOString() }
        })
        try {
          const res = await apiFetch(`/api/debit-notes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' }),
          })
          if (!res.ok) set((state) => {
            const idx = state.debitNotes.findIndex((d) => d.id === id)
            if (idx !== -1) state.debitNotes[idx] = snapshot
          })
        } catch {
          set((state) => {
            const idx = state.debitNotes.findIndex((d) => d.id === id)
            if (idx !== -1) state.debitNotes[idx] = snapshot
          })
        }
      },
    })),
    { name: 'invozen-credit-notes' }
  )
)
