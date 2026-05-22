import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { CAClient } from '@/types/ca'
import { generateId } from '../utils/ids'

interface CAState {
  clients: CAClient[]
  addClient: (client: Omit<CAClient, 'id' | 'addedAt'>) => void
  updateClient: (id: string, partial: Partial<CAClient>) => void
  removeClient: (id: string) => void
  getClientById: (id: string) => CAClient | undefined
}

export const useCAStore = create<CAState>()(
  persist(
    immer((set, get) => ({
      clients: [],

      addClient: (client) =>
        set((state) => {
          state.clients.push({
            ...client,
            id: generateId(),
            addedAt: new Date().toISOString(),
          })
        }),

      updateClient: (id, partial) =>
        set((state) => {
          const idx = state.clients.findIndex((c) => c.id === id)
          if (idx !== -1) Object.assign(state.clients[idx], partial)
        }),

      removeClient: (id) =>
        set((state) => { state.clients = state.clients.filter((c) => c.id !== id) }),

      getClientById: (id) => get().clients.find((c) => c.id === id),
    })),
    { name: 'invozen-ca-clients' }
  )
)
