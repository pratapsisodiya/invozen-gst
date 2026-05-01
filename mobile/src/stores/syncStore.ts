import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface PendingOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'invoice' | 'customer' | 'item' | 'payment' | 'quotation' | 'purchase'
  data: any
  timestamp: string
}

interface SyncState {
  pendingOperations: PendingOperation[]
  isSyncing: boolean
  lastSyncTime: string | null
  addOperation: (op: PendingOperation) => void
  removeOperation: (id: string) => void
  setSync: (isSyncing: boolean) => void
  clearQueue: () => void
  updateLastSyncTime: () => void
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      pendingOperations: [],
      isSyncing: false,
      lastSyncTime: null,

      addOperation: (op) =>
        set((state) => ({
          pendingOperations: [...state.pendingOperations, op],
        })),

      removeOperation: (id) =>
        set((state) => ({
          pendingOperations: state.pendingOperations.filter((op) => op.id !== id),
        })),

      setSync: (isSyncing) => set({ isSyncing }),

      clearQueue: () => set({ pendingOperations: [] }),

      updateLastSyncTime: () => set({ lastSyncTime: new Date().toISOString() }),
    }),
    {
      name: 'invozen-sync',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
