'use client'
import { cn } from '@/lib/utils/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, description, disabled, size = 'md' }: ToggleProps) {
  return (
    <label className={cn('flex items-center gap-3', disabled && 'opacity-50 cursor-not-allowed', !disabled && 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative rounded-full transition-colors duration-200 flex-shrink-0',
          size === 'sm' ? 'w-8 h-4' : 'w-10 h-5',
          checked ? 'bg-brand-600' : 'bg-ink-300'
        )}
      >
        <span className={cn(
          'absolute top-0.5 rounded-full bg-white transition-transform duration-200',
          size === 'sm' ? 'w-3 h-3 left-0.5' : 'w-4 h-4 left-0.5',
          checked && (size === 'sm' ? 'translate-x-4' : 'translate-x-5')
        )} />
      </button>
      {(label || description) && (
        <div>
          {label && <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>}
          {description && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>}
        </div>
      )}
    </label>
  )
}
