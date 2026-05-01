'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 rounded-lg border bg-white px-3 text-sm transition-colors outline-none',
              'focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : 'border-[var(--border)]',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              className
            )}
            style={{ color: 'var(--text)', background: 'white' }}
            aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
            aria-invalid={error ? true : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center" style={{ color: 'var(--text-muted)' }}>
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
        {helper && !error && (
          <p id={`${inputId}-helper`} className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {helper}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
