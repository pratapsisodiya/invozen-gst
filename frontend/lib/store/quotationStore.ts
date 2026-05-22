import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Quotation, QuotationStatus } from '../../types/quotation'
import type { Invoice } from '../../types/invoice'
import { generateId, generateInvoiceNumber } from '../utils/ids'
import { useInvoiceStore } from './invoiceStore'
import { useBusinessStore } from './businessStore'

interface QuotationState {
  quotations: Quotation[]
  addQuotation: (quotation: Quotation) => void
  updateQuotation: (id: string, partial: Partial<Quotation>) => void
  deleteQuotation: (id: string) => void
  setQuotations: (quotations: Quotation[]) => void
  markSent: (id: string) => void
  markAccepted: (id: string) => void
  markRejected: (id: string) => void
  convertToInvoice: (id: string) => string | null
  expireOverdue: () => number
}

export const useQuotationStore = create<QuotationState>()(
  persist(
    immer((set, get) => ({
      quotations: [],

      addQuotation: (quotation) => set((state) => { state.quotations.unshift(quotation) }),
      updateQuotation: (id, partial) =>
        set((state) => {
          const idx = state.quotations.findIndex((q) => q.id === id)
          if (idx !== -1) Object.assign(state.quotations[idx], { ...partial, updatedAt: new Date().toISOString() })
        }),
      deleteQuotation: (id) =>
        set((state) => { state.quotations = state.quotations.filter((q) => q.id !== id) }),
      setQuotations: (quotations) => set((state) => { state.quotations = quotations }),

      markSent: (id) =>
        set((state) => {
          const q = state.quotations.find((q) => q.id === id)
          if (q && q.status === 'draft') { q.status = 'sent'; q.updatedAt = new Date().toISOString() }
        }),

      markAccepted: (id) =>
        set((state) => {
          const q = state.quotations.find((q) => q.id === id)
          if (q) { q.status = 'accepted'; q.updatedAt = new Date().toISOString() }
        }),

      markRejected: (id) =>
        set((state) => {
          const q = state.quotations.find((q) => q.id === id)
          if (q) { q.status = 'rejected'; q.updatedAt = new Date().toISOString() }
        }),

      convertToInvoice: (id) => {
        const q = get().quotations.find((q) => q.id === id)
        if (!q || q.status === 'converted') return null

        const invoiceStore = useInvoiceStore.getState()
        const businessStore = useBusinessStore.getState()
        const settings = businessStore.settings

        const invoiceNumber = generateInvoiceNumber(
          settings.invoiceSettings.invoicePrefix,
          settings.invoiceSettings.currentCounter + invoiceStore.invoices.length + 1
        )

        const today = new Date().toISOString().split('T')[0]
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + settings.invoiceSettings.duePeriodDays)

        const invoice: Invoice = {
          id: generateId(),
          invoiceNumber,
          invoiceType: 'tax_invoice',
          status: 'draft',
          customerId: q.customerId,
          customerSnapshot: q.customerSnapshot,
          supplyType: q.supplyType,
          invoiceDate: today,
          dueDate: dueDate.toISOString().split('T')[0],
          lineItems: q.lineItems.map((li) => ({ ...li, id: generateId() })),
          subtotal: q.subtotal,
          discountAmount: q.discountAmount,
          taxableValue: q.taxableValue,
          cgstTotal: q.cgstTotal,
          sgstTotal: q.sgstTotal,
          igstTotal: q.igstTotal,
          cessTotal: q.lineItems.reduce((s, li) => s + (li.cessAmount ?? 0), 0),
          totalTax: q.totalTax,
          grandTotal: q.grandTotal,
          amountPaid: 0,
          balanceDue: q.grandTotal,
          notes: q.notes,
          terms: q.terms,
          placeOfSupply: q.customerSnapshot.state,
          irnNumber: null,
          irnStatus: null,
          tdsSection: null,
          tdsRate: null,
          tdsAmount: null,
          amendedInvoiceId: null,
          amendedInvoiceNumber: null,
          amendmentReason: null,
          currency: 'INR',
          exchangeRate: 1,
          attachmentIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        invoiceStore.addInvoice(invoice)

        set((state) => {
          const qn = state.quotations.find((qn) => qn.id === id)
          if (qn) {
            qn.status = 'converted'
            qn.convertedToInvoiceId = invoice.id
            qn.convertedToInvoiceNumber = invoiceNumber
            qn.updatedAt = new Date().toISOString()
          }
        })

        return invoice.id
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
