import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'

interface AmountDisplayProps {
  amount: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'warn' | 'error' | 'success' | 'muted'
  showSymbol?: boolean
}

const SIZE_CLASSES = { sm: 'text-[13px]', md: 'text-sm', lg: 'text-base font-semibold' }
const COLOR_MAP: Record<NonNullable<AmountDisplayProps['color']>, string> = {
  default: '',
  warn: 'text-warn-600',
  error: 'text-err-600',
  success: 'text-ok-600',
  muted: '',
}

export function AmountDisplay({ amount, className, size = 'md', color = 'default', showSymbol = true }: AmountDisplayProps) {
  return (
    <span
      className={cn('tabular-nums text-right', SIZE_CLASSES[size], COLOR_MAP[color], className)}
      style={color === 'default' ? { color: 'var(--text)' } : color === 'muted' ? { color: 'var(--text-muted)' } : undefined}
    >
      {showSymbol ? '₹' : ''}{formatCurrency(amount)}
    </span>
  )
}
