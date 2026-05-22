import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Item } from '../../types/item'
import { apiFetch } from '../api/fetch'

interface ItemState {
  items: Item[]
  addItem: (item: Item) => Promise<void>
  updateItem: (id: string, partial: Partial<Item>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  getItemById: (id: string) => Item | undefined
  searchItems: (query: string) => Item[]
  setItems: (items: Item[]) => void
  init: () => Promise<void>
}

export const useItemStore = create<ItemState>()(
  persist(
    immer((set, get) => ({
      items: [],

      init: async () => {
        try {
          const res = await apiFetch('/api/items')
          if (res.ok) {
            const items: Item[] = await res.json()
            set((state) => { state.items = items })
          }
        } catch {
          // keep localStorage data on network failure
        }
      },

      addItem: async (item) => {
        set((state) => { state.items.push(item) })
        try {
          await apiFetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          })
        } catch {
          // already in local state
        }
      },

      updateItem: async (id, partial) => {
        set((state) => {
          const idx = state.items.findIndex((i) => i.id === id)
          if (idx !== -1) Object.assign(state.items[idx], partial)
        })
        try {
          await apiFetch(`/api/items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partial),
          })
        } catch {
          // already in local state
        }
      },

      deleteItem: async (id) => {
        set((state) => { state.items = state.items.filter((i) => i.id !== id) })
        try {
          await apiFetch(`/api/items/${id}`, { method: 'DELETE' })
        } catch {
          // already removed locally
        }
      },

      getItemById: (id) => get().items.find((i) => i.id === id),

      searchItems: (query) => {
        const q = query.toLowerCase()
        return get().items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.hsnCode?.includes(q) ||
            i.sacCode?.includes(q)
        )
      },

      setItems: (items) => set((state) => { state.items = items }),
    })),
    { name: 'invozen-items' }
  )
)
