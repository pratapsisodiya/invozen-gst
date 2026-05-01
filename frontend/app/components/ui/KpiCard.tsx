import { cn } from '@/lib/utils/cn'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrencyWithSymbol } from '@/lib/utils/formatters'

interface KpiCardProps {
  title: string
  value: number | string
  isAmount?: boolean
  trend?: { value: number; label: string }
  subtext?: string
  subtextColor?: 'warn' | 'error' | 'success' | 'default'
  className?: string
  icon?: React.ReactNode
}

export function KpiCard({ title, value, isAmount = false, trend, subtext, subtextColor = 'default', className, icon }: KpiCardProps) {
  const subtextColorMap = {
    warn: 'text-warn-600',
    error: 'text-err-600',
    success: 'text-ok-600',
    default: '',
  }

  return (
    <div
      className={cn('rounded-xl p-4 bg-white flex flex-col gap-1', className)}
      style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{title}</span>
        {icon && <div style={{ color: 'var(--text-faint)' }}>{icon}</div>}
      </div>
      <div className="text-[1.625rem] font-bold tabular-nums" style={{ color: 'var(--text)', lineHeight: 1.2 }}>
        {isAmount && typeof value === 'number' ? formatCurrencyWithSymbol(value) : value}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {trend && (
          <span className={cn('inline-flex items-center gap-0.5 text-[12px] font-semibold', trend.value >= 0 ? 'text-ok-600' : 'text-err-600')}>
            {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
        {subtext && (
          <span className={cn('text-[12px]', subtextColorMap[subtextColor] || '')} style={!subtextColorMap[subtextColor] ? { color: 'var(--text-muted)' } : {}}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  )
}
