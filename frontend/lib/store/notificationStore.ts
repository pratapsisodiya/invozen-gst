import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Notification } from '../../types/notification'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  addNotification: (n: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void
  setNotifications: (notifications: Notification[]) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    immer((set, get) => ({
      notifications: [],
      unreadCount: 0,
      markRead: (id) =>
        set((state) => {
          const n = state.notifications.find((n) => n.id === id)
          if (n && !n.isRead) {
            n.isRead = true
            state.unreadCount = Math.max(0, state.unreadCount - 1)
          }
        }),
      markAllRead: () =>
        set((state) => {
          state.notifications.forEach((n) => { n.isRead = true })
          state.unreadCount = 0
        }),
      addNotification: (data) =>
        set((state) => {
          state.notifications.unshift({
            ...data,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          })
          state.unreadCount += 1
        }),
      setNotifications: (notifications) =>
        set((state) => {
          state.notifications = notifications
          state.unreadCount = notifications.filter((n) => !n.isRead).length
        }),
    })),
    { name: 'invozen-notifications' }
  )
)
