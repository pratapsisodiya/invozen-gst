import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { RecurringTemplate, RecurringLog } from '@/lib/types/recurring'

interface RecurringState {
  templates: RecurringTemplate[]
  logs: RecurringLog[]
  setTemplates: (templates: RecurringTemplate[]) => void
  setLogs: (logs: RecurringLog[]) => void
  addTemplate: (template: RecurringTemplate) => void
  updateTemplate: (id: string, updates: Partial<RecurringTemplate>) => void
  deleteTemplate: (id: string) => void
  addLog: (log: RecurringLog) => void
}

export const useRecurringStore = create<RecurringState>()(
  persist(
    (set) => ({
      templates: [],
      logs: [],

      setTemplates: (templates) => set({ templates }),
      setLogs: (logs) => set({ logs }),

      addTemplate: (template) =>
        set((state) => ({ templates: [template, ...state.templates] })),

      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      addLog: (log) =>
        set((state) => ({ logs: [log, ...state.logs] })),
    }),
    {
      name: 'invozen-recurring',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
