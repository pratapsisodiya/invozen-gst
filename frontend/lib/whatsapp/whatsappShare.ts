import type { Invoice } from '@/types/invoice'

export interface WhatsAppMessageOptions {
  customerName: string
  phone: string
  invoiceNumber: string
  amount: number
  dueDate: string
  businessName: string
  upiId?: string
}

export function buildWhatsAppMessage(opts: WhatsAppMessageOptions): string {
  const due = new Date(opts.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  let msg = `Dear ${opts.customerName},\n\nThis is a friendly reminder from *${opts.businessName}*.\n\n`
  msg += `📄 *Invoice:* ${opts.invoiceNumber}\n`
  msg += `💰 *Amount:* ₹${opts.amount.toLocaleString('en-IN')}\n`
  msg += `📅 *Due Date:* ${due}\n`
  if (opts.upiId) {
    msg += `\n💳 *Pay via UPI:* ${opts.upiId}\n`
  }
  msg += `\nKindly arrange payment at the earliest. Thank you for your business! 🙏`
  return msg
}

export function openWhatsApp(phone: string, message: string): void {
  const cleaned = phone.replace(/\D/g, '')
  const withCountry = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

export function shareInvoiceViaWhatsApp(
  invoice: Invoice,
  customerPhone: string,
  businessName: string,
  upiId?: string
): void {
  const message = buildWhatsAppMessage({
    customerName: invoice.customerSnapshot.name,
    phone: customerPhone,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.balanceDue > 0 ? invoice.balanceDue : invoice.grandTotal,
    dueDate: invoice.dueDate,
    businessName,
    upiId,
  })
  openWhatsApp(customerPhone, message)
}

export interface BulkReminderItem {
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  phone: string
  amount: number
  daysOverdue: number
  dueDate: string
}

export function buildOverdueReminderMessage(opts: {
  customerName: string
  invoiceNumber: string
  amount: number
  dueDate: string
  daysOverdue: number
  businessName: string
  upiId?: string
}): string {
  const due = new Date(opts.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const urgency = opts.daysOverdue >= 60 ? '🚨 URGENT' : opts.daysOverdue >= 30 ? '⚠️ Action Required' : '📢 Reminder'
  let msg = `${urgency} — *${opts.businessName}*\n\nDear ${opts.customerName},\n\n`
  msg += `📄 *Invoice:* ${opts.invoiceNumber}\n`
  msg += `💰 *Outstanding:* ₹${opts.amount.toLocaleString('en-IN')}\n`
  msg += `📅 *Due Date:* ${due}\n`
  msg += `⏰ *Overdue By:* ${opts.daysOverdue} day${opts.daysOverdue !== 1 ? 's' : ''}\n`
  if (opts.upiId) {
    msg += `\n💳 *Pay via UPI:* ${opts.upiId}\n`
  }
  if (opts.daysOverdue >= 60) {
    msg += `\n⚠️ This invoice is significantly overdue. Please clear the outstanding immediately to avoid disruption of services.`
  } else if (opts.daysOverdue >= 30) {
    msg += `\nKindly arrange payment at the earliest. Delayed payments affect our business relationship.`
  } else {
    msg += `\nPlease process the payment at your earliest convenience. Thank you! 🙏`
  }
  return msg
}

export function buildBulkReminderQueue(
  items: BulkReminderItem[],
  businessName: string,
  upiId?: string
): Array<{ invoiceId: string; invoiceNumber: string; customerName: string; phone: string; message: string; amount: number; daysOverdue: number }> {
  return items
    .filter((item) => item.phone && item.phone.trim())
    .map((item) => ({
      invoiceId: item.invoiceId,
      invoiceNumber: item.invoiceNumber,
      customerName: item.customerName,
      phone: item.phone,
      amount: item.amount,
      daysOverdue: item.daysOverdue,
      message: buildOverdueReminderMessage({
        customerName: item.customerName,
        invoiceNumber: item.invoiceNumber,
        amount: item.amount,
        dueDate: item.dueDate,
        daysOverdue: item.daysOverdue,
        businessName,
        upiId,
      }),
    }))
}
