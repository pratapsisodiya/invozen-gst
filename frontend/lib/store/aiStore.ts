import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { generateId } from '@/lib/utils/ids'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface AIState {
  messages: AIMessage[]
  isOpen: boolean
  isLoading: boolean
  addMessage: (msg: Omit<AIMessage, 'id' | 'createdAt'>) => void
  clearMessages: () => void
  setOpen: (open: boolean) => void
  setLoading: (loading: boolean) => void
}

export const useAIStore = create<AIState>()(
  persist(
    immer((set) => ({
      messages: [],
      isOpen: false,
      isLoading: false,
      addMessage: (msg) => set((state) => {
        state.messages.push({ ...msg, id: generateId(), createdAt: new Date().toISOString() })
      }),
      clearMessages: () => set((state) => { state.messages = [] }),
      setOpen: (open) => set((state) => { state.isOpen = open }),
      setLoading: (loading) => set((state) => { state.isLoading = loading }),
    })),
    {
      name: 'invozen-ai',
      partialize: (state) => ({ messages: state.messages }),
    }
  )
)
