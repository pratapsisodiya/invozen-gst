import { cn } from '@/lib/utils/cn'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--surface-2)' }}>
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>{title}</h3>
      {description && <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
