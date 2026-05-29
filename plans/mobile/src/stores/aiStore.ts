import { create } from 'zustand'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIState {
  messages: Message[]
  isOpen: boolean
  isLoading: boolean
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  setLoading: (loading: boolean) => void
  toggle: () => void
  open: () => void
  close: () => void
  clearHistory: () => void
}

export const useAIStore = create<AIState>()((set) => ({
  messages: [],
  isOpen: false,
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setMessages: (messages) => set({ messages }),

  setLoading: (loading) => set({ isLoading: loading }),

  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  open: () => set({ isOpen: true }),

  close: () => set({ isOpen: false }),

  clearHistory: () => set({ messages: [] }),
}))
