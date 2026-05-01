import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Item } from '@/lib/types/item'

interface ItemState {
  items: Item[]
  setItems: (items: Item[]) => void
  addItem: (item: Item) => void
  updateItem: (id: string, updates: Partial<Item>) => void
  deleteItem: (id: string) => void
  getItemById: (id: string) => Item | undefined
  searchItems: (query: string) => Item[]
}

export const useItemStore = create<ItemState>()(
  persist(
    (set, get) => ({
      items: [],

      setItems: (items) => set({ items }),

      addItem: (item) =>
        set((state) => ({ items: [item, ...state.items] })),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),

      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      getItemById: (id) => {
        return get().items.find((item) => item.id === id)
      },

      searchItems: (query) => {
        const { items } = get()
        if (!query) return items

        const search = query.toLowerCase()
        return items.filter(
          (item:any) =>
            item.name.toLowerCase().includes(search) ||
            item.description?.toLowerCase().includes(search) ||
            item.hsnSac?.toLowerCase().includes(search)
        )
      },
    }),
    {
      name: 'invozen-items',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
