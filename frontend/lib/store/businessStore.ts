import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { BusinessProfile, AppSettings } from '../../types/business'

interface BusinessState {
  profile: BusinessProfile
  settings: AppSettings
  isSeeded: boolean
  updateProfile: (partial: Partial<BusinessProfile>) => void
  updateSettings: (partial: Partial<AppSettings>) => void
  setSeeded: () => void
}

const defaultProfile: BusinessProfile = {
  businessName: 'Prakash Enterprises',
  legalName: 'Prakash Enterprises',
  businessType: 'Sole Proprietor',
  industry: 'Retail',
  gstin: '27AAAPZ1234A1ZQ',
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
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    immer((set) => ({
      profile: defaultProfile,
      settings: defaultSettings,
      isSeeded: false,
      updateProfile: (partial) =>
        set((state) => { Object.assign(state.profile, partial) }),
      updateSettings: (partial) =>
        set((state) => { Object.assign(state.settings, partial) }),
      setSeeded: () => set((state) => { state.isSeeded = true }),
    })),
    { name: 'invozen-business' }
  )
)
