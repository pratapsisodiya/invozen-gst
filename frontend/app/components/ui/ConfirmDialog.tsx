'use client'
import { Modal } from './Modal'
import { cn } from '@/lib/utils/cn'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  loading?: boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'default', loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="px-5 py-4">
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>{message}</p>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-ink-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          disabled={loading}
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50',
            variant === 'danger' ? 'bg-err-600 hover:bg-red-700' :
            variant === 'warning' ? 'bg-warn-600 hover:bg-amber-700' :
            'bg-brand-600 hover:bg-brand-700'
          )}
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
