export interface ReminderRecord {
  id: string
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  phone: string
  sentAt: string
  amount: number
  daysOverdue: number
  channel: 'whatsapp' | 'email'
}
