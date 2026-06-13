'use client'

import { useEffect } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useItemStore } from '@/lib/store/itemStore'
import { usePaymentStore } from '@/lib/store/paymentStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useQuotationStore } from '@/lib/store/quotationStore'
import { useCreditNoteStore } from '@/lib/store/creditNoteStore'
import { useRecurringStore } from '@/lib/store/recurringStore'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { useCollectionsAutopilotStore } from '@/lib/store/autopilotStore'
import { buildCollectionsAutopilotPayload, runCollectionsAutopilot } from '@/lib/ai/autopilotClient'

// One-time clear of old mock localStorage data from previous sessions
const MOCK_CLEARED_KEY = 'invozen-mock-cleared-v1'
const MOCK_STORE_KEYS = [
  'invozen-invoices', 'invozen-customers', 'invozen-items',
  'invozen-payments', 'invozen-purchases', 'invozen-business',
  'invozen-notifications', 'invozen-quotations', 'invozen-recurring',
  'invozen-credit-notes', 'invozen-collections-autopilot',
]

function clearOldMockData() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(MOCK_CLEARED_KEY)) return
  MOCK_STORE_KEYS.forEach((key) => localStorage.removeItem(key))
  localStorage.setItem(MOCK_CLEARED_KEY, 'true')
}

function checkAndNotifyOverdueInvoices() {
  const { invoices } = useInvoiceStore.getState()
  const { addNotification, notifications } = useNotificationStore.getState()
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

export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const initInvoices = useInvoiceStore((state) => state.init)
  const initCustomers = useCustomerStore((state) => state.init)
  const initItems = useItemStore((state) => state.init)
  const initPayments = usePaymentStore((state) => state.init)
  const initBusiness = useBusinessStore((state) => state.init)
  const initVendors = usePurchaseStore((state) => state.initVendors)
  const initPurchases = usePurchaseStore((state) => state.initPurchases)
  const initQuotations = useQuotationStore((state) => state.init)
  const initCreditNotes = useCreditNoteStore((state) => state.init)
  const initRecurring = useRecurringStore((state) => state.init)
  const initNotifications = useNotificationStore((state) => state.init)
  const syncAutopilotEvaluation = useCollectionsAutopilotStore((state) => state.syncEvaluation)
  const executeAllOverdue = useRecurringStore((state) => state.executeAllOverdue)
  const expireOverdueQuotations = useQuotationStore((state) => state.expireOverdue)

  useEffect(() => {
    clearOldMockData()

    void Promise.all([
      initInvoices(),
      initCustomers(),
      initItems(),
      initPayments(),
      initBusiness(),
      initVendors(),
      initPurchases(),
      initQuotations(),
      initCreditNotes(),
      initRecurring(),
      initNotifications(),
    ]).then(async () => {
      await executeAllOverdue()
      expireOverdueQuotations()
      checkAndNotifyOverdueInvoices()
      try {
        const payload = buildCollectionsAutopilotPayload({
          invoices: useInvoiceStore.getState().invoices,
          customers: useCustomerStore.getState().customers,
          payments: usePaymentStore.getState().payments,
          profile: useBusinessStore.getState().profile,
          settings: useBusinessStore.getState().settings,
          triggeredBy: 'bootstrap',
        })
        const evaluation = await runCollectionsAutopilot(payload)
        syncAutopilotEvaluation(evaluation)
      } catch {
        // bootstrap should remain resilient when autopilot refresh fails
      }
    })
  }, [
    initInvoices, initCustomers, initItems, initPayments, initBusiness,
    initVendors, initPurchases, initQuotations, initCreditNotes,
    initRecurring, initNotifications, syncAutopilotEvaluation, executeAllOverdue, expireOverdueQuotations,
  ])

  return children
}
