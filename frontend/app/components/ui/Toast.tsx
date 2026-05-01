'use client'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useUIStore } from '@/lib/store/uiStore'
import { cn } from '@/lib/utils/cn'

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const COLORS = {
  success: 'border-ok-600/20 bg-ok-50',
  error: 'border-err-600/20 bg-err-50',
  info: 'border-blue-500/20 bg-blue-50',
  warning: 'border-warn-600/20 bg-warn-50',
}

const ICON_COLORS = {
  success: 'text-ok-600',
  error: 'text-err-600',
  info: 'text-blue-600',
  warning: 'text-warn-600',
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-lg border pointer-events-auto',
              'animate-in slide-in-from-right-4 duration-200',
              COLORS[toast.type]
            )}
            style={{ boxShadow: 'var(--shadow-lg)', minWidth: '280px', maxWidth: '360px' }}
          >
            <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', ICON_COLORS[toast.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{toast.title}</p>
              {toast.message && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-black/5"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
