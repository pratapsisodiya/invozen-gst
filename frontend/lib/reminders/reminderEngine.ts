import type { Invoice } from '@/types/invoice'

export type ReminderTrigger = 'before_due_3' | 'on_due_date' | 'overdue_7' | 'overdue_30'

export interface ReminderRule {
  trigger: ReminderTrigger
  label: string
  enabled: boolean
  template: string
}

export const DEFAULT_REMINDER_RULES: ReminderRule[] = [
  {
    trigger: 'before_due_3',
    label: '3 days before due',
    enabled: true,
    template: 'Dear [Customer Name], your invoice [Invoice No] for ₹[Amount] is due on [Due Date]. Kindly arrange payment. Thank you.',
  },
  {
    trigger: 'on_due_date',
    label: 'On due date',
    enabled: true,
    template: 'Dear [Customer Name], your invoice [Invoice No] for ₹[Amount] is due TODAY. Please make payment at the earliest.',
  },
  {
    trigger: 'overdue_7',
    label: '7 days overdue',
    enabled: true,
    template: 'Dear [Customer Name], your invoice [Invoice No] for ₹[Amount] is 7 days OVERDUE. Please settle immediately to avoid further action.',
  },
  {
    trigger: 'overdue_30',
    label: '30 days overdue',
    enabled: false,
    template: 'Dear [Customer Name], your invoice [Invoice No] for ₹[Amount] is 30 days overdue. Please contact us immediately to resolve this.',
  },
]

export interface PendingReminder {
  invoice: Invoice
  trigger: ReminderTrigger
  label: string
  message: string
  daysUntilDue: number
}

export function personalizeTemplate(template: string, invoice: Invoice): string {
  const due = new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return template
    .replace('[Customer Name]', invoice.customerSnapshot.name)
    .replace('[Invoice No]', invoice.invoiceNumber)
    .replace('[Amount]', `₹${invoice.balanceDue.toLocaleString('en-IN')}`)
    .replace('[Due Date]', due)
}

export function getRemindersToSend(
  invoices: Invoice[],
  rules: ReminderRule[],
  today = new Date()
): PendingReminder[] {
  const reminders: PendingReminder[] = []

  for (const inv of invoices) {
    if (!['sent', 'overdue'].includes(inv.status)) continue
    if (inv.balanceDue <= 0) continue

    const due = new Date(inv.dueDate)
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    for (const rule of rules) {
      if (!rule.enabled) continue
      const match =
        (rule.trigger === 'before_due_3' && daysUntilDue === 3) ||
        (rule.trigger === 'on_due_date' && daysUntilDue === 0) ||
        (rule.trigger === 'overdue_7' && daysUntilDue === -7) ||
        (rule.trigger === 'overdue_30' && daysUntilDue === -30)

      if (match) {
        reminders.push({
          invoice: inv,
          trigger: rule.trigger,
          label: rule.label,
          message: personalizeTemplate(rule.template, inv),
          daysUntilDue,
        })
      }
    }
  }

  return reminders
}
