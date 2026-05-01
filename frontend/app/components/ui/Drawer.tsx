'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  side?: 'right' | 'bottom'
  className?: string
}

export function Drawer({ open, onClose, title, children, side = 'right', className }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed z-50 bg-white transition-transform duration-300',
          side === 'right'
            ? 'top-0 right-0 h-full w-full max-w-xl'
            : 'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl',
          side === 'right' && (open ? 'translate-x-0' : 'translate-x-full'),
          side === 'bottom' && (open ? 'translate-y-0' : 'translate-y-full'),
          className
        )}
        style={{ boxShadow: 'var(--shadow-xl)' }}
      >
        <div className="flex flex-col h-full">
          {title && (
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
              <button onClick={onClose} className="p-1 rounded-md hover:bg-ink-100" aria-label="Close">
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  )
}
