'use client'
import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { SkeletonRow } from './SkeletonRow'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  width?: string
  headerClassName?: string
  cellClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; href?: string; onClick?: () => void }
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  className?: string
  compact?: boolean
}

export function DataTable<T>({
  columns, data, loading, emptyTitle = 'No data found',
  emptyDescription, emptyAction, rowKey, onRowClick, className, compact,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border', className)} style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-sm" role="table">
        <thead>
          <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide whitespace-nowrap',
                  col.sortable && 'cursor-pointer select-none hover:text-brand-700',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.headerClassName
                )}
                style={{ color: 'var(--text-muted)', width: col.width }}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
            : data.length === 0
            ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            )
            : data.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  'border-t transition-colors',
                  compact ? 'h-10' : 'h-11',
                  onRowClick && 'cursor-pointer hover:bg-ink-50/50'
                )}
                style={{ borderColor: 'var(--border-soft)' }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 py-2',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.cellClassName
                    )}
                    style={{ color: 'var(--text)' }}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  )
}
