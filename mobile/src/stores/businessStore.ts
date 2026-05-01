import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { BusinessProfile, InvoiceSettings, BankDetails } from '@/lib/types/business'

interface BusinessState {
  profile: BusinessProfile | null
  invoiceSettings: InvoiceSettings
  bankDetails: BankDetails | null
  setProfile: (profile: BusinessProfile) => void
  updateProfile: (updates: Partial<BusinessProfile>) => void
  setInvoiceSettings: (settings: InvoiceSettings) => void
  setBankDetails: (details: BankDetails) => void
}

const defaultInvoiceSettings: InvoiceSettings = {
  prefix: 'INV',
  startingNumber: 1,
  dueDays: 30,
  defaultNotes: '',
  defaultTerms: '',
  showGSTIN: true,
  showPAN: true,
  showBankDetails: true,
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      profile: null,
      invoiceSettings: defaultInvoiceSettings,
      bankDetails: null,
      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),
      setInvoiceSettings: (settings) => set({ invoiceSettings: settings }),
      setBankDetails: (details) => set({ bankDetails: details }),
    }),
    {
      name: 'invozen-business',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
