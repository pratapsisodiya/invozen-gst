import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { BusinessProfile, AppSettings } from '../../types/business'
import { apiFetch } from '../api/fetch'

interface BusinessState {
  profile: BusinessProfile
  settings: AppSettings
  updateProfile: (partial: Partial<BusinessProfile>) => Promise<void>
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>
  updateBankBalance: (amount: number) => void
  init: () => Promise<void>
}

const defaultProfile: BusinessProfile = {
  businessName: '',
  legalName: '',
  businessType: 'Sole Proprietor',
  industry: 'Other',
  gstin: '',
  gstRegistrationType: 'unregistered',
  stateCode: '',
  state: '',
  filingFrequency: 'monthly',
  panNumber: '',
  tanNumber: null,
  phone: '',
  email: '',
  billingAddress: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
  },
  logoUrl: null,
  signatureUrl: null,
  branches: [],
}

const defaultSettings: AppSettings = {
  invoiceSettings: {
    invoicePrefix: 'INV',
    invoiceStartNumber: 1,
    currentCounter: 1,
    duePeriodDays: 30,
    defaultTemplate: 'standard',
    footerNote: '',
    termsAndConditions: '',
    showBankDetails: false,
    showUpiQr: false,
  },
  bankDetails: {
    bankName: '',
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  },
  whatsappNumber: '',
  defaultGstRate: 18,
  razorpayConnected: false,
  currentBankBalance: 0,
  cashAlertThreshold: 50000,
  notificationSettings: [
    { id: 'n1', label: 'Invoice paid notification', desc: 'Get notified when a customer pays an invoice', enabled: true },
    { id: 'n2', label: 'Payment overdue alert', desc: 'Alert when invoices become overdue', enabled: true },
    { id: 'n3', label: 'GST filing reminder', desc: 'Reminder before GST due dates', enabled: true },
    { id: 'n4', label: 'WhatsApp reminder sent', desc: 'Confirmation when reminder is delivered', enabled: false },
    { id: 'n5', label: 'New accountant access', desc: 'When accountant logs in to your portal', enabled: true },
    { id: 'n6', label: 'Weekly summary', desc: 'Weekly email digest of business activity', enabled: false },
  ],
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    immer((set, get) => ({
      profile: defaultProfile,
      settings: defaultSettings,

      init: async () => {
        try {
          const res = await apiFetch('/api/business')
          if (res.ok) {
            const data = await res.json()
            set((state) => {
              if (data.profile) state.profile = data.profile
              if (data.settings) state.settings = data.settings
            })
          }
        } catch {
          // keep localStorage data on network failure
        }
      },

      updateProfile: async (partial) => {
        set((state) => { Object.assign(state.profile, partial) })
        const { profile, settings } = get()
        try {
          await apiFetch('/api/business', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile, settings }),
          })
        } catch {
          // already in local state
        }
      },

      updateSettings: async (partial) => {
        set((state) => { Object.assign(state.settings, partial) })
        const { profile, settings } = get()
        try {
          await apiFetch('/api/business', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile, settings }),
          })
        } catch {
          // already in local state
        }
      },

      updateBankBalance: (amount) => set((state) => { state.settings.currentBankBalance = amount }),
    })),
    { name: 'invozen-business' }
  )
)
