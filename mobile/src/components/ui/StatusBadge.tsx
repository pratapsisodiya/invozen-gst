import { Badge } from './Badge'
import type { InvoiceStatus } from '@/lib/types/invoice'

interface StatusBadgeProps {
  status: InvoiceStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getLabel = () => {
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'sent':
        return 'Sent'
      case 'paid':
        return 'Paid'
      case 'overdue':
        return 'Overdue'
      case 'void':
        return 'Void'
      default:
        return status
    }
  }

  const getVariant = () => {
    switch (status) {
      case 'paid':
        return 'success'
      case 'sent':
        return 'info'
      case 'overdue':
        return 'error'
      case 'draft':
        return 'warning'
      default:
        return 'default'
    }
  }

  return <Badge label={getLabel()} variant={getVariant()} />
}
