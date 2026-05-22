import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Notice } from '../../types/notice'

interface NoticeState {
  notices: Notice[]
  saveNotice: (notice: Notice) => void
  updateNoticeReply: (id: string, reply: string) => void
  deleteNotice: (id: string) => void
}

export const useNoticeStore = create<NoticeState>()(
  persist(
    immer((set) => ({
      notices: [],

      saveNotice: (notice) =>
        set((state) => {
          const idx = state.notices.findIndex((n) => n.id === notice.id)
          if (idx !== -1) state.notices[idx] = notice
          else state.notices.unshift(notice)
        }),

      updateNoticeReply: (id, reply) =>
        set((state) => {
          const n = state.notices.find((n) => n.id === id)
          if (n) n.savedReply = reply
        }),

      deleteNotice: (id) =>
        set((state) => {
          state.notices = state.notices.filter((n) => n.id !== id)
        }),
    })),
    { name: 'invozen-notices' }
  )
)
