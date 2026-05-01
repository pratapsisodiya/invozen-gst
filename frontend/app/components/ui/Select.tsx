'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helper?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helper, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 rounded-lg border bg-white px-3 pr-9 text-sm transition-colors outline-none appearance-none',
              'focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-red-400' : 'border-[var(--border)]',
              className
            )}
            style={{ color: 'var(--text)' }}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>
        {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
        {helper && !error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{helper}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
