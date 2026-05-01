import type { Notification } from '../../types/notification'

export const mockNotifications: Notification[] = [
  { id: 'notif-01', type: 'invoice_paid', title: 'Payment Received', message: 'Ravi Sharma paid ₹1,19,540 for INV-PE-2025-014', linkUrl: '/invoices/inv-014', isRead: false, createdAt: '2025-02-14T10:30:00Z' },
  { id: 'notif-02', type: 'gst_due', title: 'GSTR-1 Due in 5 Days', message: 'GSTR-1 for January 2025 is due on 11th February 2025', linkUrl: '/reports/gstr1', isRead: false, createdAt: '2025-02-09T09:00:00Z' },
  { id: 'notif-03', type: 'invoice_overdue', title: 'Invoice Overdue', message: 'Invoice PE-2025-026 from Amit Kumar is 45 days overdue', linkUrl: '/invoices/inv-026', isRead: false, createdAt: '2025-02-08T08:00:00Z' },
  { id: 'notif-04', type: 'reminder_sent', title: 'Reminders Sent', message: 'WhatsApp reminders sent to 3 customers with overdue invoices', linkUrl: '/reminders', isRead: false, createdAt: '2025-02-07T10:00:00Z' },
  { id: 'notif-05', type: 'payment_received', title: 'Payment Received', message: 'Rajesh Menon paid ₹3,27,600 for INV-PE-2025-015', linkUrl: '/invoices/inv-015', isRead: true, createdAt: '2025-01-25T15:00:00Z' },
  { id: 'notif-06', type: 'einvoice', title: 'IRN Generated', message: 'IRN generated successfully for INV-PE-2025-015', linkUrl: '/einvoice', isRead: true, createdAt: '2025-01-07T11:00:00Z' },
  { id: 'notif-07', type: 'system', title: 'Razorpay Integration', message: 'Connect your Razorpay account to accept online payments', linkUrl: '/settings', isRead: true, createdAt: '2025-01-05T09:00:00Z' },
  { id: 'notif-08', type: 'gst_due', title: 'GSTR-3B Due in 7 Days', message: 'GSTR-3B for December 2024 is due on 20th January 2025', linkUrl: '/reports/gstr3b', isRead: true, createdAt: '2025-01-13T09:00:00Z' },
  { id: 'notif-09', type: 'invoice_paid', title: 'Payment Received', message: 'Ananya Das paid ₹1,18,000 for INV-PE-2025-004', linkUrl: '/invoices/inv-004', isRead: true, createdAt: '2024-12-15T16:00:00Z' },
  { id: 'notif-10', type: 'accountant', title: 'Accountant Flagged Issue', message: 'Your accountant flagged 2 invoices for review in December period', linkUrl: '/accountant', isRead: true, createdAt: '2024-12-12T14:00:00Z' },
  { id: 'notif-11', type: 'invoice_overdue', title: 'Invoice Overdue', message: 'Invoice PE-2025-027 from Vikram Singh is 30 days overdue', linkUrl: '/invoices/inv-027', isRead: true, createdAt: '2025-01-30T09:00:00Z' },
  { id: 'notif-12', type: 'reminder_sent', title: 'Automated Reminder Sent', message: 'Reminder sent to Amit Kumar for overdue invoice PE-2025-026', linkUrl: '/reminders', isRead: true, createdAt: '2025-01-15T10:00:00Z' },
  { id: 'notif-13', type: 'payment_received', title: 'Payment Received', message: 'Sunita Patel paid ₹2,55,120 for INV-PE-2025-002', linkUrl: '/invoices/inv-002', isRead: true, createdAt: '2024-12-08T11:00:00Z' },
  { id: 'notif-14', type: 'system', title: 'Welcome to Invozen GST', message: 'Your account is ready. Start by creating your first invoice.', linkUrl: '/dashboard', isRead: true, createdAt: '2024-11-01T09:00:00Z' },
  { id: 'notif-15', type: 'einvoice', title: 'E-Invoice Threshold', message: 'Your turnover exceeds ₹5 crore threshold. E-invoicing is now mandatory.', linkUrl: '/einvoice', isRead: true, createdAt: '2025-01-01T09:00:00Z' },
]
