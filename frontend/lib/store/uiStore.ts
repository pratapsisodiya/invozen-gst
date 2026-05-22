import { create } from 'zustand'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
}

interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  shortcutsPanelOpen: boolean
  toasts: Toast[]
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  openModal: (id: string) => void
  closeModal: () => void
  openShortcutsPanel: () => void
  closeShortcutsPanel: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  activeModal: null,
  shortcutsPanelOpen: false,
  toasts: [],
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  openShortcutsPanel: () => set({ shortcutsPanelOpen: true }),
  closeShortcutsPanel: () => set({ shortcutsPanelOpen: false }),
  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    setTimeout(() => get().removeToast(id), 4000)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
