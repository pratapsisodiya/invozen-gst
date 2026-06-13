import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AgentAction } from '@/types/agentAction'

interface ActionDeskState {
  manualActions: AgentAction[]
  dismissedActionIds: string[]
  saveAction: (action: AgentAction) => void
  removeManualAction: (id: string) => void
  dismissAction: (id: string) => void
  restoreDismissedActions: () => void
}

export const useActionDeskStore = create<ActionDeskState>()(
  persist(
    immer((set) => ({
      manualActions: [],
      dismissedActionIds: [],
      saveAction: (action) => set((state) => {
        const existing = state.manualActions.findIndex((item) => item.id === action.id)
        if (existing >= 0) state.manualActions[existing] = action
        else state.manualActions.unshift(action)
        state.manualActions = state.manualActions.slice(0, 20)
        state.dismissedActionIds = state.dismissedActionIds.filter((id) => id !== action.id)
      }),
      removeManualAction: (id) => set((state) => {
        state.manualActions = state.manualActions.filter((action) => action.id !== id)
      }),
      dismissAction: (id) => set((state) => {
        if (!state.dismissedActionIds.includes(id)) state.dismissedActionIds.push(id)
      }),
      restoreDismissedActions: () => set((state) => {
        state.dismissedActionIds = []
      }),
    })),
    { name: 'invozen-action-desk' }
  )
)
