import { cn } from '@/lib/utils/cn'
import type { InvoiceStatus } from '@/types/invoice'

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  paid: 'bg-ok-50 text-ok-600',
  sent: 'bg-blue-50 text-blue-600',
  draft: 'bg-ink-100 text-ink-500',
  overdue: 'bg-err-50 text-err-600',
  void: 'bg-ink-100 text-ink-400',
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: 'Paid',
  sent: 'Sent',
  draft: 'Draft',
  overdue: 'Overdue',
  void: 'Void',
}

interface StatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
        STATUS_CLASSES[status],
        className
      )}
      aria-label={`Status: ${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  className?: string
}

const BADGE_VARIANTS: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-brand-50 text-brand-700',
  success: 'bg-ok-50 text-ok-600',
  warning: 'bg-warn-50 text-warn-600',
  error: 'bg-err-50 text-err-600',
  info: 'bg-blue-50 text-blue-600',
  neutral: 'bg-ink-100 text-ink-500',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', BADGE_VARIANTS[variant], className)}>
      {children}
    </span>
  )
}
