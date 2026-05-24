import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { RecurringTemplate, RecurringLog, RecurringFrequency } from '../../types/recurring'
import type { Invoice } from '../../types/invoice'
import { generateId } from '../utils/ids'
import { useInvoiceStore } from './invoiceStore'
import { useNotificationStore } from './notificationStore'
import { apiFetch } from '../api/fetch'

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
  addTemplate: (template: RecurringTemplate) => Promise<void>
  updateTemplate: (id: string, partial: Partial<RecurringTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  setTemplates: (templates: RecurringTemplate[]) => void
  pauseTemplate: (id: string, reason: string) => Promise<void>
  resumeTemplate: (id: string) => Promise<void>
  generateNow: (templateId: string, triggeredBy?: 'auto' | 'manual') => Promise<string | null>
  executeAllOverdue: () => Promise<{ templateId: string; invoiceId: string | null }[]>
  setLogs: (logs: RecurringLog[]) => void
  init: () => Promise<void>
}

export const useRecurringStore = create<RecurringState>()(
  persist(
    immer((set, get) => ({
      templates: [],
      logs: [],

      init: async () => {
        try {
          const [tRes, lRes] = await Promise.all([
            apiFetch('/api/recurring'),
            apiFetch('/api/recurring/logs'),
          ])
          if (tRes.ok) {
            const templates: RecurringTemplate[] = await tRes.json()
            set((state) => { state.templates = templates })
          }
          if (lRes.ok) {
            const logs: RecurringLog[] = await lRes.json()
            set((state) => { state.logs = logs })
          }
        } catch { /* keep localStorage data on network failure */ }
      },

      addTemplate: async (template) => {
        set((state) => { state.templates.unshift(template) })
        try {
          const res = await apiFetch('/api/recurring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template),
          })
          if (!res.ok) set((state) => { state.templates = state.templates.filter((t) => t.id !== template.id) })
        } catch {
          set((state) => { state.templates = state.templates.filter((t) => t.id !== template.id) })
        }
      },

      updateTemplate: async (id, partial) => {
        const prev = get().templates.find((t) => t.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const idx = state.templates.findIndex((t) => t.id === id)
          if (idx !== -1) Object.assign(state.templates[idx], { ...partial, updatedAt: new Date().toISOString() })
        })
        try {
          const res = await apiFetch(`/api/recurring/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partial),
          })
          if (!res.ok) set((state) => {
            const idx = state.templates.findIndex((t) => t.id === id)
            if (idx !== -1) state.templates[idx] = snapshot
          })
        } catch {
          set((state) => {
            const idx = state.templates.findIndex((t) => t.id === id)
            if (idx !== -1) state.templates[idx] = snapshot
          })
        }
      },

      deleteTemplate: async (id) => {
        const snapshot = JSON.parse(JSON.stringify(get().templates))
        set((state) => { state.templates = state.templates.filter((t) => t.id !== id) })
        try {
          const res = await apiFetch(`/api/recurring/${id}`, { method: 'DELETE' })
          if (!res.ok) set((state) => { state.templates = snapshot })
        } catch {
          set((state) => { state.templates = snapshot })
        }
      },

      setTemplates: (templates) => set((state) => { state.templates = templates }),

      pauseTemplate: async (id, reason) => {
        const prev = get().templates.find((t) => t.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const t = state.templates.find((t) => t.id === id)
          if (t) { t.status = 'paused'; t.pausedReason = reason; t.updatedAt = new Date().toISOString() }
        })
        try {
          const res = await apiFetch(`/api/recurring/${id}/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
          })
          if (!res.ok) set((state) => {
            const idx = state.templates.findIndex((t) => t.id === id)
            if (idx !== -1) state.templates[idx] = snapshot
          })
        } catch {
          set((state) => {
            const idx = state.templates.findIndex((t) => t.id === id)
            if (idx !== -1) state.templates[idx] = snapshot
          })
        }
      },

      resumeTemplate: async (id) => {
        const prev = get().templates.find((t) => t.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
        set((state) => {
          const t = state.templates.find((t) => t.id === id)
          if (t) { t.status = 'active'; t.pausedReason = null; t.updatedAt = new Date().toISOString() }
        })
        try {
          const res = await apiFetch(`/api/recurring/${id}/resume`, { method: 'POST' })
          if (!res.ok) set((state) => {
            const idx = state.templates.findIndex((t) => t.id === id)
            if (idx !== -1) state.templates[idx] = snapshot
          })
        } catch {
          set((state) => {
            const idx = state.templates.findIndex((t) => t.id === id)
            if (idx !== -1) state.templates[idx] = snapshot
          })
        }
      },

      generateNow: async (templateId, triggeredBy = 'manual') => {
        const tpl = get().templates.find((t) => t.id === templateId)
        if (!tpl || tpl.status !== 'active') return null

        try {
          const res = await apiFetch(`/api/recurring/${templateId}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ triggeredBy }),
          })
          if (!res.ok) return null

          const invoice: Invoice = await res.json()
          useInvoiceStore.getState().localAddInvoice(invoice)

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
            invoiceNumber: invoice.invoiceNumber,
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
        } catch {
          return null
        }
      },

      executeAllOverdue: async () => {
        const today = new Date().toISOString().split('T')[0]
        const results: { templateId: string; invoiceId: string | null }[] = []
        for (const template of get().templates) {
          if (template.status !== 'active') continue
          if (template.nextGenerationDate <= today) {
            const invoiceId = await get().generateNow(template.id, 'auto')
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
