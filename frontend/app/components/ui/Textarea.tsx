'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helper?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors outline-none resize-y min-h-[80px]',
            'focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
            error ? 'border-red-400' : 'border-[var(--border)]',
            className
          )}
          style={{ color: 'var(--text)' }}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helper && !error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{helper}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
