import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  ApprovalTask,
  AutopilotRun,
  CollectionsAutopilotEvaluationResponse,
  CollectionsAutopilotSettings,
  ExecutionLog,
} from '@/types/autopilot'
import { DEFAULT_COLLECTIONS_AUTOPILOT_SETTINGS } from '@/lib/ai/autopilot/collections'

interface AutopilotState {
  collectionsSettings: CollectionsAutopilotSettings
  approvalTasks: ApprovalTask[]
  runs: AutopilotRun[]
  logs: ExecutionLog[]
  syncEvaluation: (payload: CollectionsAutopilotEvaluationResponse) => void
  updateTask: (id: string, patch: Partial<ApprovalTask>) => void
  appendLog: (log: ExecutionLog) => void
  setCollectionsSettings: (patch: Partial<CollectionsAutopilotSettings>) => void
  getTaskById: (id: string) => ApprovalTask | undefined
}

export const useCollectionsAutopilotStore = create<AutopilotState>()(
  persist(
    immer((set, get) => ({
      collectionsSettings: DEFAULT_COLLECTIONS_AUTOPILOT_SETTINGS,
      approvalTasks: [],
      runs: [],
      logs: [],

      syncEvaluation: (payload) => set((state) => {
        for (const incoming of payload.approvalTasks) {
          const existingIndex = state.approvalTasks.findIndex((task) => task.id === incoming.id)
          if (existingIndex >= 0) {
            state.approvalTasks[existingIndex] = incoming
            continue
          }

          const activeDuplicateIndex = state.approvalTasks.findIndex((task) =>
            task.fingerprint === incoming.fingerprint
            && ['queued', 'snoozed', 'escalated'].includes(task.status),
          )

          if (activeDuplicateIndex >= 0) {
            state.approvalTasks[activeDuplicateIndex] = {
              ...state.approvalTasks[activeDuplicateIndex],
              ...incoming,
              id: state.approvalTasks[activeDuplicateIndex].id,
            }
          } else {
            state.approvalTasks.unshift(incoming)
          }
        }

        if (!state.runs.some((run) => run.id === payload.run.id)) {
          state.runs.unshift(payload.run)
        }

        for (const log of payload.logs) {
          if (!state.logs.some((existing) => existing.id === log.id)) {
            state.logs.unshift(log)
          }
        }

        state.approvalTasks = state.approvalTasks.slice(0, 200)
        state.runs = state.runs.slice(0, 40)
        state.logs = state.logs.slice(0, 400)
      }),

      updateTask: (id, patch) => set((state) => {
        const index = state.approvalTasks.findIndex((task) => task.id === id)
        if (index >= 0) {
          state.approvalTasks[index] = {
            ...state.approvalTasks[index],
            ...patch,
            updatedAt: patch.updatedAt ?? new Date().toISOString(),
          }
        }
      }),

      appendLog: (log) => set((state) => {
        if (!state.logs.some((existing) => existing.id === log.id)) {
          state.logs.unshift(log)
          state.logs = state.logs.slice(0, 400)
        }
      }),

      setCollectionsSettings: (patch) => set((state) => {
        state.collectionsSettings = { ...state.collectionsSettings, ...patch }
      }),

      getTaskById: (id) => get().approvalTasks.find((task) => task.id === id),
    })),
    { name: 'invozen-collections-autopilot' },
  ),
)
