import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Notification } from '../../types/notification'
import { apiFetch } from '../api/fetch'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  addNotification: (n: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void
  setNotifications: (notifications: Notification[]) => void
  init: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    immer((set, get) => ({
      notifications: [],
      unreadCount: 0,

      markRead: (id) => {
        set((state) => {
          const n = state.notifications.find((n) => n.id === id)
          if (n && !n.isRead) {
            n.isRead = true
            state.unreadCount = Math.max(0, state.unreadCount - 1)
          }
        })
        apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' }).catch(() => {})
      },

      markAllRead: () => {
        set((state) => {
          state.notifications.forEach((n) => { n.isRead = true })
          state.unreadCount = 0
        })
        apiFetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {})
      },

      addNotification: (data) => {
        const notification: Notification = {
          ...data,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }
        set((state) => {
          state.notifications.unshift(notification)
          state.unreadCount += 1
        })
        apiFetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification),
        }).catch(() => {})
      },

      setNotifications: (notifications) =>
        set((state) => {
          state.notifications = notifications
          state.unreadCount = notifications.filter((n) => !n.isRead).length
        }),

      init: async () => {
        try {
          const res = await apiFetch('/api/notifications')
          if (res.ok) {
            const notifications: Notification[] = await res.json()
            set((state) => {
              state.notifications = notifications
              state.unreadCount = notifications.filter((n) => !n.isRead).length
            })
          }
        } catch { /* keep localStorage data on network failure */ }
      },
    })),
    { name: 'invozen-notifications' }
  )
)
