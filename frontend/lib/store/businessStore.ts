import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { BusinessProfile, AppSettings } from '../../types/business'
import { apiFetch } from '../api/fetch'

interface BusinessState {
  profile: BusinessProfile
  settings: AppSettings
  isSeeded: boolean
  updateProfile: (partial: Partial<BusinessProfile>) => Promise<void>
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>
  updateBankBalance: (amount: number) => void
  setSeeded: () => void
  init: () => Promise<void>
}

const defaultProfile: BusinessProfile = {
  businessName: 'Prakash Enterprises',
  legalName: 'Prakash Enterprises',
  businessType: 'Sole Proprietor',
  industry: 'Retail',
  gstin: '',
  gstRegistrationType: 'regular',
  stateCode: '27',
  state: 'Maharashtra',
  filingFrequency: 'monthly',
  panNumber: 'AAAPZ1234A',
  tanNumber: null,
  phone: '9876543210',
  email: 'prakash@example.com',
  billingAddress: {
    line1: '123, Main Market',
    line2: 'Near Railway Station',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400001',
  },
  logoUrl: null,
  signatureUrl: null,
  branches: [],
}

const defaultSettings: AppSettings = {
  invoiceSettings: {
    invoicePrefix: 'PE',
    invoiceStartNumber: 1,
    currentCounter: 51,
    duePeriodDays: 30,
    defaultTemplate: 'standard',
    footerNote: 'Thank you for your business!',
    termsAndConditions: 'Payment due within 30 days. Late payment may incur interest @2% per month.',
    showBankDetails: true,
    showUpiQr: true,
  },
  bankDetails: {
    bankName: 'State Bank of India',
    accountName: 'Prakash Enterprises',
    accountNumber: '12345678901234',
    ifscCode: 'SBIN0001234',
    upiId: 'prakash@upi',
  },
  whatsappNumber: '9876543210',
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
      isSeeded: false,

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

      setSeeded: () => set((state) => { state.isSeeded = true }),
    })),
    { name: 'invozen-business' }
  )
)
