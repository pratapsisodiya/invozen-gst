import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('rounded animate-pulse', className)}
      style={{ background: 'var(--surface-2)', ...style }}
    />
  )
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="h-11">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-2">
          <Skeleton className="h-4 rounded" style={{ width: i === 0 ? '60%' : i === cols - 1 ? '40%' : '80%' }} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 bg-white" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}
