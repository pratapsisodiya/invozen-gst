import { useBusinessStore } from '../store/businessStore'
import { useCustomerStore } from '../store/customerStore'
import { useItemStore } from '../store/itemStore'
import { useInvoiceStore } from '../store/invoiceStore'
import { usePaymentStore } from '../store/paymentStore'
import { useNotificationStore } from '../store/notificationStore'
import { usePurchaseStore } from '../store/purchaseStore'
import { useCreditNoteStore } from '../store/creditNoteStore'
import { useRecurringStore } from '../store/recurringStore'
import { useQuotationStore } from '../store/quotationStore'
import { mockCustomers } from './customers'
import { mockItems } from './items'
import { mockInvoices } from './invoices'
import { mockPayments } from './payments'
import { mockNotifications } from './notifications'
import { mockVendors } from './vendors'
import { mockPurchases } from './purchases'
import { mockCreditNotes, mockDebitNotes } from './creditNotes'
import { mockRecurringTemplates, mockRecurringLogs } from './recurring'
import { mockQuotations } from './quotations'

export function seedMockData() {
  // Skip if already seeded — prevents partial re-seeding on repeated calls
  if (useBusinessStore.getState().isSeeded) return

  const customerStore = useCustomerStore.getState()
  const itemStore = useItemStore.getState()
  const invoiceStore = useInvoiceStore.getState()
  const paymentStore = usePaymentStore.getState()
  const notificationStore = useNotificationStore.getState()
  const purchaseStore = usePurchaseStore.getState()
  const creditNoteStore = useCreditNoteStore.getState()
  const recurringStore = useRecurringStore.getState()
  const quotationStore = useQuotationStore.getState()

  if (customerStore.customers.length === 0) customerStore.setCustomers(mockCustomers)
  if (itemStore.items.length === 0) itemStore.setItems(mockItems)
  if (invoiceStore.invoices.length === 0) invoiceStore.setInvoices(mockInvoices)
  if (paymentStore.payments.length === 0) paymentStore.setPayments(mockPayments)
  if (notificationStore.notifications.length === 0) notificationStore.setNotifications(mockNotifications)
  if (purchaseStore.vendors.length === 0) purchaseStore.setVendors(mockVendors)
  if (purchaseStore.purchases.length === 0) purchaseStore.setPurchases(mockPurchases)
  if (creditNoteStore.creditNotes.length === 0) creditNoteStore.setCreditNotes(mockCreditNotes)
  if (creditNoteStore.debitNotes.length === 0) creditNoteStore.setDebitNotes(mockDebitNotes)
  if (recurringStore.templates.length === 0) recurringStore.setTemplates(mockRecurringTemplates)
  if (recurringStore.logs.length === 0) recurringStore.setLogs(mockRecurringLogs)
  if (quotationStore.quotations.length === 0) quotationStore.setQuotations(mockQuotations)

  // Mark as seeded so subsequent calls are no-ops
  useBusinessStore.getState().setSeeded()
}
