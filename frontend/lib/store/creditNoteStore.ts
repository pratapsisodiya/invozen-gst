import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { CreditNote, DebitNote } from '../../types/creditNote'

interface CreditNoteState {
  creditNotes: CreditNote[]
  debitNotes: DebitNote[]
  addCreditNote: (cn: CreditNote) => void
  updateCreditNote: (id: string, partial: Partial<CreditNote>) => void
  deleteCreditNote: (id: string) => void
  setCreditNotes: (cns: CreditNote[]) => void
  approveCreditNote: (id: string) => void
  addDebitNote: (dn: DebitNote) => void
  updateDebitNote: (id: string, partial: Partial<DebitNote>) => void
  deleteDebitNote: (id: string) => void
  setDebitNotes: (dns: DebitNote[]) => void
  approveDebitNote: (id: string) => void
}

export const useCreditNoteStore = create<CreditNoteState>()(
  persist(
    immer((set) => ({
      creditNotes: [],
      debitNotes: [],

      addCreditNote: (cn) => set((state) => { state.creditNotes.unshift(cn) }),
      updateCreditNote: (id, partial) =>
        set((state) => {
          const idx = state.creditNotes.findIndex((c) => c.id === id)
          if (idx !== -1) Object.assign(state.creditNotes[idx], { ...partial, updatedAt: new Date().toISOString() })
        }),
      deleteCreditNote: (id) =>
        set((state) => { state.creditNotes = state.creditNotes.filter((c) => c.id !== id) }),
      setCreditNotes: (cns) => set((state) => { state.creditNotes = cns }),
      approveCreditNote: (id) =>
        set((state) => {
          const cn = state.creditNotes.find((c) => c.id === id)
          if (cn) { cn.status = 'approved'; cn.updatedAt = new Date().toISOString() }
        }),

      addDebitNote: (dn) => set((state) => { state.debitNotes.unshift(dn) }),
      updateDebitNote: (id, partial) =>
        set((state) => {
          const idx = state.debitNotes.findIndex((d) => d.id === id)
          if (idx !== -1) Object.assign(state.debitNotes[idx], { ...partial, updatedAt: new Date().toISOString() })
        }),
      deleteDebitNote: (id) =>
        set((state) => { state.debitNotes = state.debitNotes.filter((d) => d.id !== id) }),
      setDebitNotes: (dns) => set((state) => { state.debitNotes = dns }),
      approveDebitNote: (id) =>
        set((state) => {
          const dn = state.debitNotes.find((d) => d.id === id)
          if (dn) { dn.status = 'approved'; dn.updatedAt = new Date().toISOString() }
        }),
    })),
    { name: 'invozen-credit-notes' }
  )
)
