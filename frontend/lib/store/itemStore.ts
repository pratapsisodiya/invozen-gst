import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Item } from '../../types/item'

interface ItemState {
  items: Item[]
  addItem: (item: Item) => void
  updateItem: (id: string, partial: Partial<Item>) => void
  deleteItem: (id: string) => void
  getItemById: (id: string) => Item | undefined
  searchItems: (query: string) => Item[]
  setItems: (items: Item[]) => void
}

export const useItemStore = create<ItemState>()(
  persist(
    immer((set, get) => ({
      items: [],
      addItem: (item) => set((state) => { state.items.push(item) }),
      updateItem: (id, partial) =>
        set((state) => {
          const idx = state.items.findIndex((i) => i.id === id)
          if (idx !== -1) Object.assign(state.items[idx], partial)
        }),
      deleteItem: (id) =>
        set((state) => { state.items = state.items.filter((i) => i.id !== id) }),
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
