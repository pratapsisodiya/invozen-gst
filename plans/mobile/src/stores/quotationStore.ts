import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Quotation } from '@/lib/types/quotation'

interface QuotationState {
  quotations: Quotation[]
  setQuotations: (quotations: Quotation[]) => void
  addQuotation: (quotation: Quotation) => void
  updateQuotation: (id: string, updates: Partial<Quotation>) => void
  deleteQuotation: (id: string) => void
  getQuotationById: (id: string) => Quotation | undefined
}

export const useQuotationStore = create<QuotationState>()(
  persist(
    (set, get) => ({
      quotations: [],

      setQuotations: (quotations) => set({ quotations }),

      addQuotation: (quotation) =>
        set((state) => ({ quotations: [quotation, ...state.quotations] })),

      updateQuotation: (id, updates) =>
        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === id ? { ...q, ...updates } : q
          ),
        })),

      deleteQuotation: (id) =>
        set((state) => ({
          quotations: state.quotations.filter((q) => q.id !== id),
        })),

      getQuotationById: (id) => {
        return get().quotations.find((q) => q.id === id)
      },
    }),
    {
      name: 'invozen-quotations',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
