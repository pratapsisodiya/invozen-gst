import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CreditNote, DebitNote } from '@/lib/types/creditNote'

interface CreditNoteState {
  creditNotes: CreditNote[]
  debitNotes: DebitNote[]
  setCreditNotes: (notes: CreditNote[]) => void
  setDebitNotes: (notes: DebitNote[]) => void
  addCreditNote: (note: CreditNote) => void
  addDebitNote: (note: DebitNote) => void
  updateCreditNote: (id: string, updates: Partial<CreditNote>) => void
  updateDebitNote: (id: string, updates: Partial<DebitNote>) => void
  deleteCreditNote: (id: string) => void
  deleteDebitNote: (id: string) => void
}

export const useCreditNoteStore = create<CreditNoteState>()(
  persist(
    (set) => ({
      creditNotes: [],
      debitNotes: [],

      setCreditNotes: (notes) => set({ creditNotes: notes }),
      setDebitNotes: (notes) => set({ debitNotes: notes }),

      addCreditNote: (note) =>
        set((state) => ({ creditNotes: [note, ...state.creditNotes] })),

      addDebitNote: (note) =>
        set((state) => ({ debitNotes: [note, ...state.debitNotes] })),

      updateCreditNote: (id, updates) =>
        set((state) => ({
          creditNotes: state.creditNotes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        })),

      updateDebitNote: (id, updates) =>
        set((state) => ({
          debitNotes: state.debitNotes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        })),

      deleteCreditNote: (id) =>
        set((state) => ({
          creditNotes: state.creditNotes.filter((n) => n.id !== id),
        })),

      deleteDebitNote: (id) =>
        set((state) => ({
          debitNotes: state.debitNotes.filter((n) => n.id !== id),
        })),
    }),
    {
      name: 'invozen-credit-notes',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
