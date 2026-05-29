import { Badge } from './Badge'
import type { InvoiceStatus } from '@/lib/types/invoice'

interface StatusBadgeProps {
  status: InvoiceStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<InvoiceStatus, { label: string; variant: any }> = {
    paid:    { label: 'Paid',    variant: 'success' },
    sent:    { label: 'Sent',    variant: 'info' },
    draft:   { label: 'Draft',   variant: 'neutral' },
    overdue: { label: 'Overdue', variant: 'error' },
    void:    { label: 'Void',    variant: 'neutral' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' }
  return <Badge label={label} variant={variant} />
}
