export type NotificationType =
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'reminder_sent'
  | 'gst_due'
  | 'payment_received'
  | 'system'
  | 'accountant'
  | 'einvoice'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  linkUrl: string | null
  isRead: boolean
  createdAt: string
}
