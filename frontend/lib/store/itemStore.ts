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
        } catch (err) {
          console.error('[itemStore] addItem failed, rolling back:', err)
          set((state) => { state.items = state.items.filter((i) => i.id !== item.id) })
        }
      },

      updateItem: async (id, partial) => {
        const prev = get().items.find((i) => i.id === id)
        if (!prev) return
        const snapshot = JSON.parse(JSON.stringify(prev))
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
        } catch (err) {
          console.error('[itemStore] updateItem failed, rolling back:', err)
          set((state) => {
            const idx = state.items.findIndex((i) => i.id === id)
            if (idx !== -1) state.items[idx] = snapshot
          })
        }
      },

      deleteItem: async (id) => {
        const prevArr = JSON.parse(JSON.stringify(get().items))
        set((state) => { state.items = state.items.filter((i) => i.id !== id) })
        try {
          await apiFetch(`/api/items/${id}`, { method: 'DELETE' })
        } catch (err) {
          console.error('[itemStore] deleteItem failed, rolling back:', err)
          set((state) => { state.items = prevArr })
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
