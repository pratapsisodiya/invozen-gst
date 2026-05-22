import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AuditEntry, AuditAction, AuditEntity } from '@/types/audit'
import { generateId } from '../utils/ids'

interface AuditState {
  entries: AuditEntry[]
  log: (action: AuditAction, entity: AuditEntity, entityId: string, entityLabel: string, description: string, metadata?: Record<string, unknown>) => void
  clear: () => void
}

export const useAuditStore = create<AuditState>()(
  persist(
    immer((set) => ({
      entries: [],

      log: (action, entity, entityId, entityLabel, description, metadata) =>
        set((state) => {
          const entry: AuditEntry = {
            id: generateId(),
            action,
            entity,
            entityId,
            entityLabel,
            userId: 'current-user',
            userName: 'You',
            description,
            metadata,
            createdAt: new Date().toISOString(),
          }
          state.entries.unshift(entry)
          // Keep last 500 entries
          if (state.entries.length > 500) state.entries = state.entries.slice(0, 500)
        }),

      clear: () => set((state) => { state.entries = [] }),
    })),
    { name: 'invozen-audit' }
  )
)
