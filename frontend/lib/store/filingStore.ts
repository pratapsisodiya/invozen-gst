import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { FilingRecord, FilingType, FilingStatus, FilingChecklistItem } from '@/types/filing'
import { FILING_CHECKLISTS } from '@/types/filing'
import { generateId } from '../utils/ids'

interface FilingState {
  records: FilingRecord[]
  getOrCreate: (type: FilingType, period: string, dueDate: string) => FilingRecord
  updateStatus: (id: string, status: FilingStatus, filedBy?: string) => void
  toggleChecklistItem: (id: string, itemId: string) => void
  updateNotes: (id: string, notes: string) => void
  setChecklistItems: (id: string, items: FilingChecklistItem[]) => void
  getByPeriod: (period: string) => FilingRecord[]
  getByType: (type: FilingType) => FilingRecord[]
}

export const useFilingStore = create<FilingState>()(
  persist(
    immer((set, get) => ({
      records: [],

      getOrCreate: (type, period, dueDate) => {
        const existing = get().records.find((r) => r.type === type && r.period === period)
        if (existing) return existing

        const checklistItems = FILING_CHECKLISTS[type].map((label, i) => ({
          id: `${generateId()}-${i}`,
          label,
          completed: false,
        }))

        const record: FilingRecord = {
          id: generateId(),
          type,
          period,
          status: 'not_started',
          dueDate,
          filedDate: null,
          filedBy: null,
          notes: null,
          checklistItems,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        set((state) => { state.records.push(record) })
        return record
      },

      updateStatus: (id, status, filedBy) =>
        set((state) => {
          const r = state.records.find((r) => r.id === id)
          if (!r) return
          r.status = status
          r.updatedAt = new Date().toISOString()
          if (status === 'filed') {
            r.filedDate = new Date().toISOString()
            if (filedBy) r.filedBy = filedBy
          }
        }),

      toggleChecklistItem: (id, itemId) =>
        set((state) => {
          const r = state.records.find((r) => r.id === id)
          if (!r) return
          const item = r.checklistItems.find((c) => c.id === itemId)
          if (item) item.completed = !item.completed
          r.updatedAt = new Date().toISOString()
          // Auto-advance status
          const allDone = r.checklistItems.every((c) => c.completed)
          if (allDone && r.status === 'in_progress') r.status = 'reviewed'
          else if (!allDone && r.status === 'not_started') r.status = 'in_progress'
        }),

      updateNotes: (id, notes) =>
        set((state) => {
          const r = state.records.find((r) => r.id === id)
          if (r) { r.notes = notes; r.updatedAt = new Date().toISOString() }
        }),

      setChecklistItems: (id, items) =>
        set((state) => {
          const r = state.records.find((r) => r.id === id)
          if (r) { r.checklistItems = items; r.updatedAt = new Date().toISOString() }
        }),

      getByPeriod: (period) => get().records.filter((r) => r.period === period),
      getByType: (type) => get().records.filter((r) => r.type === type),
    })),
    { name: 'invozen-filings' }
  )
)
