import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { RecurringTemplate, RecurringLog, RecurringFrequency } from '../../types/recurring'
import type { Invoice } from '../../types/invoice'
import { generateId, generateInvoiceNumber } from '../utils/ids'
import { useInvoiceStore } from './invoiceStore'
import { useBusinessStore } from './businessStore'
import { useNotificationStore } from './notificationStore'

function advanceDate(dateStr: string, frequency: RecurringFrequency, customDays: number | null): string {
  const d = new Date(dateStr)
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
    case 'custom': d.setDate(d.getDate() + (customDays ?? 30)); break
  }
  return d.toISOString().split('T')[0]
}

interface RecurringState {
  templates: RecurringTemplate[]
  logs: RecurringLog[]
  addTemplate: (template: RecurringTemplate) => void
  updateTemplate: (id: string, partial: Partial<RecurringTemplate>) => void
  deleteTemplate: (id: string) => void
  setTemplates: (templates: RecurringTemplate[]) => void
  pauseTemplate: (id: string, reason: string) => void
  resumeTemplate: (id: string) => void
  generateNow: (templateId: string, triggeredBy?: 'auto' | 'manual') => string | null
  executeAllOverdue: () => { templateId: string; invoiceId: string | null }[]
  setLogs: (logs: RecurringLog[]) => void
}

export const useRecurringStore = create<RecurringState>()(
  persist(
    immer((set, get) => ({
      templates: [],
      logs: [],

      addTemplate: (template) => set((state) => { state.templates.unshift(template) }),
      updateTemplate: (id, partial) =>
        set((state) => {
          const idx = state.templates.findIndex((t) => t.id === id)
          if (idx !== -1) Object.assign(state.templates[idx], { ...partial, updatedAt: new Date().toISOString() })
        }),
      deleteTemplate: (id) =>
        set((state) => { state.templates = state.templates.filter((t) => t.id !== id) }),
      setTemplates: (templates) => set((state) => { state.templates = templates }),

      pauseTemplate: (id, reason) =>
        set((state) => {
          const t = state.templates.find((t) => t.id === id)
          if (t) { t.status = 'paused'; t.pausedReason = reason; t.updatedAt = new Date().toISOString() }
        }),

      resumeTemplate: (id) =>
        set((state) => {
          const t = state.templates.find((t) => t.id === id)
          if (t) { t.status = 'active'; t.pausedReason = null; t.updatedAt = new Date().toISOString() }
        }),

      generateNow: (templateId, triggeredBy = 'manual') => {
        const tpl = get().templates.find((t) => t.id === templateId)
        if (!tpl || tpl.status !== 'active') return null

        const invoiceStore = useInvoiceStore.getState()
        const businessStore = useBusinessStore.getState()
        const settings = businessStore.settings

        const invoiceNumber = generateInvoiceNumber(
          settings.invoiceSettings.invoicePrefix,
          settings.invoiceSettings.currentCounter + get().templates.reduce((s, t) => s + t.totalGenerated, 0) + 1
        )

        const today = new Date().toISOString().split('T')[0]
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + settings.invoiceSettings.duePeriodDays)

        const invoice: Invoice = {
          id: generateId(),
          invoiceNumber,
          invoiceType: 'tax_invoice',
          status: tpl.autoSend ? 'sent' : 'draft',
          customerId: tpl.customerId,
          customerSnapshot: tpl.customerSnapshot,
          supplyType: 'intra',
          invoiceDate: today,
          dueDate: dueDate.toISOString().split('T')[0],
          lineItems: tpl.lineItems.map((li) => ({ ...li, id: generateId() })),
          subtotal: tpl.lineItems.reduce((s, li) => s + li.quantity * li.rate, 0),
          discountAmount: 0,
          taxableValue: tpl.lineItems.reduce((s, li) => s + li.taxableValue, 0),
          cgstTotal: tpl.lineItems.reduce((s, li) => s + li.cgst, 0),
          sgstTotal: tpl.lineItems.reduce((s, li) => s + li.sgst, 0),
          igstTotal: tpl.lineItems.reduce((s, li) => s + li.igst, 0),
          cessTotal: tpl.lineItems.reduce((s, li) => s + (li.cessAmount ?? 0), 0),
          totalTax: tpl.lineItems.reduce((s, li) => s + li.cgst + li.sgst + li.igst, 0),
          grandTotal: tpl.lineItems.reduce((s, li) => s + li.totalAmount, 0),
          amountPaid: 0,
          balanceDue: tpl.lineItems.reduce((s, li) => s + li.totalAmount, 0),
          notes: tpl.notes,
          terms: tpl.terms,
          placeOfSupply: tpl.customerSnapshot.state,
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

        useNotificationStore.getState().addNotification({
          type: 'invoice_paid',
          title: 'Recurring Invoice Generated',
          message: `${invoice.invoiceNumber} created from template "${tpl.name}"`,
          linkUrl: `/invoices/${invoice.id}`,
        })

        const log: RecurringLog = {
          id: generateId(),
          templateId,
          invoiceId: invoice.id,
          invoiceNumber,
          generatedAt: new Date().toISOString(),
          status: 'generated',
          triggeredBy,
          error: null,
        }

        set((state) => {
          const t = state.templates.find((t) => t.id === templateId)
          if (t) {
            t.totalGenerated += 1
            t.lastGeneratedAt = new Date().toISOString()
            t.nextGenerationDate = advanceDate(t.nextGenerationDate, t.frequency, t.customDays)
            t.updatedAt = new Date().toISOString()
          }
          state.logs.unshift(log)
        })

        return invoice.id
      },

      executeAllOverdue: () => {
        const today = new Date().toISOString().split('T')[0]
        const results: { templateId: string; invoiceId: string | null }[] = []
        for (const template of get().templates) {
          if (template.status !== 'active') continue
          if (template.nextGenerationDate <= today) {
            const invoiceId = get().generateNow(template.id, 'auto')
            results.push({ templateId: template.id, invoiceId })
          }
        }
        return results
      },

      setLogs: (logs) => set((state) => { state.logs = logs }),
    })),
    { name: 'invozen-recurring' }
  )
)
