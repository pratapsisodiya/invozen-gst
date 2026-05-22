export type AuditAction = 'create' | 'update' | 'delete' | 'status_change' | 'payment' | 'export'
export type AuditEntity =
  | 'invoice'
  | 'customer'
  | 'purchase'
  | 'payment'
  | 'item'
  | 'vendor'
  | 'credit_note'
  | 'debit_note'
  | 'quotation'
  | 'expense'

export interface AuditEntry {
  id: string
  action: AuditAction
  entity: AuditEntity
  entityId: string
  entityLabel: string
  userId: string
  userName: string
  description: string
  metadata?: Record<string, unknown>
  createdAt: string
}
