'use client'

import { useEffect } from 'react'
import { seedMockData } from '@/lib/mock/seed'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useItemStore } from '@/lib/store/itemStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useRecurringStore } from '@/lib/store/recurringStore'
import { useQuotationStore } from '@/lib/store/quotationStore'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { generateComplianceEvents } from '@/lib/gst/complianceCalendar'

function checkAndNotifyOverdueInvoices() {
  const { invoices } = useInvoiceStore.getState()
  const { addNotification, notifications } = useNotificationStore.getState()
  const today = new Date().toISOString().split('T')[0]
  const alreadyNotified = new Set(notifications.map((n) => n.linkUrl).filter(Boolean))

  for (const inv of invoices) {
    if (inv.status === 'overdue' && inv.balanceDue > 0) {
      const linkUrl = `/invoices/${inv.id}`
      if (!alreadyNotified.has(linkUrl)) {
        addNotification({
          type: 'invoice_overdue',
          title: 'Invoice Overdue',
          message: `${inv.invoiceNumber} — ₹${inv.balanceDue.toLocaleString('en-IN')} overdue`,
          linkUrl,
        })
      }
    }
  }
}

function checkFilingDeadlines() {
  const { addNotification, notifications } = useNotificationStore.getState()
  const today = new Date()
  const compliance = generateComplianceEvents('monthly', {})
  if (!compliance.nextDue) return

  const dueDate = new Date(compliance.nextDue.dueDate)
  const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)
  if (daysUntil <= 5 && daysUntil >= 0) {
    const alreadyHas = notifications.some((n) => n.type === 'gst_due' && !n.isRead)
    if (!alreadyHas) {
      addNotification({
        type: 'gst_due',
        title: `GST Filing Due${daysUntil === 0 ? ' Today' : ` in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}`,
        message: `File your ${compliance.nextDue.type} return by ${dueDate.toLocaleDateString('en-IN')}`,
        linkUrl: '/filing-workflow',
      })
    }
  }
}

export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const initInvoices = useInvoiceStore((state) => state.init)
  const initCustomers = useCustomerStore((state) => state.init)
  const initItems = useItemStore((state) => state.init)
  const initPayments = usePaymentStore((state) => state.init)
  const initBusiness = useBusinessStore((state) => state.init)
  const executeAllOverdue = useRecurringStore((state) => state.executeAllOverdue)
  const expireOverdueQuotations = useQuotationStore((state) => state.expireOverdue)

  useEffect(() => {
    seedMockData()
    void Promise.all([
      initInvoices(),
      initCustomers(),
      initItems(),
      initPayments(),
      initBusiness(),
    ]).then(() => {
      executeAllOverdue()
      expireOverdueQuotations()
      checkAndNotifyOverdueInvoices()
      checkFilingDeadlines()
    })
  }, [initInvoices, initCustomers, initItems, initPayments, initBusiness, executeAllOverdue, expireOverdueQuotations])

  return children
}
