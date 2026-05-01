'use client'
import { cn } from '@/lib/utils/cn'

interface Tab {
  id?: string
  key?: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab?: string
  activeKey?: string
  onChange: (id: string) => void
  className?: string
  variant?: 'underline' | 'pill'
}

export function Tabs({ tabs, activeTab, activeKey, onChange, className, variant = 'underline' }: TabsProps) {
  const current = activeTab ?? activeKey ?? ''
  const getId = (tab: Tab) => tab.id ?? tab.key ?? ''

  if (variant === 'pill') {
    return (
      <div className={cn('flex gap-1 p-1 rounded-lg', className)} style={{ background: 'var(--surface-2)' }}>
        {tabs.map((tab) => {
          const id = getId(tab)
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                current === id ? 'bg-white text-brand-700 shadow-sm' : 'hover:bg-white/50'
              )}
              style={{ color: current === id ? undefined : 'var(--text-muted)' }}
              role="tab"
              aria-selected={current === id}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full', current === id ? 'bg-brand-100 text-brand-700' : 'bg-ink-200 text-ink-500')}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('flex gap-0 border-b overflow-x-auto', className)} style={{ borderColor: 'var(--border)' }} role="tablist">
      {tabs.map((tab) => {
        const id = getId(tab)
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            role="tab"
            aria-selected={current === id}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              current === id ? 'border-brand-600 text-brand-700' : 'border-transparent hover:text-brand-600'
            )}
            style={{ color: current === id ? undefined : 'var(--text-muted)' }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full', current === id ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500')}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
