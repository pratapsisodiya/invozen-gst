import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Attachment } from '@/types/attachment'

interface AttachmentState {
  byEntity: Record<string, Attachment[]>
  getAttachments: (entityId: string) => Attachment[]
  setAttachments: (entityId: string, attachments: Attachment[]) => void
  removeAttachment: (entityId: string, attachmentId: string) => void
}

export const useAttachmentStore = create<AttachmentState>()(
  persist(
    immer((set, get) => ({
      byEntity: {},
      getAttachments: (entityId) => get().byEntity[entityId] ?? [],
      setAttachments: (entityId, attachments) =>
        set((state) => { state.byEntity[entityId] = attachments }),
      removeAttachment: (entityId, attachmentId) =>
        set((state) => {
          const list = state.byEntity[entityId]
          if (list) state.byEntity[entityId] = list.filter((a) => a.id !== attachmentId)
        }),
    })),
    { name: 'invozen-attachments' }
  )
)
