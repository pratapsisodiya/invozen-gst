import { Router } from 'express'
import businessRouter from './business.js'
import usersRouter from './users.js'
import bulkRouter from './bulk.js'
import freelancerRouter from './freelancer.js'
import customersRouter from './customers.js'
import itemsRouter from './items.js'
import invoicesRouter from './invoices.js'
import paymentsRouter from './payments.js'
import vendorsRouter from './vendors.js'
import purchasesRouter from './purchases.js'
import expensesRouter from './expenses.js'
import quotationsRouter from './quotations.js'
import creditNotesRouter from './creditNotes.js'
import debitNotesRouter from './debitNotes.js'
import recurringRouter from './recurring.js'
import notificationsRouter from './notifications.js'
import filingsRouter from './filings.js'
import auditRouter from './audit.js'
import attachmentsRouter from './attachments.js'
import inventoryRouter from './inventory.js'
import caClientsRouter from './caClients.js'
import ewayBillsRouter from './ewayBills.js'
import paymentGatewayRouter from './paymentGateway.js'
import aiRouter from './ai.js'

const router = Router()

router.use('/business', businessRouter)
router.use('/users', usersRouter)
router.use('/bulk', bulkRouter)
router.use('/freelancer', freelancerRouter)
router.use('/customers', customersRouter)
router.use('/items', itemsRouter)
router.use('/invoices', invoicesRouter)
router.use('/payments', paymentsRouter)
router.use('/vendors', vendorsRouter)
router.use('/purchases', purchasesRouter)
router.use('/expenses', expensesRouter)
router.use('/quotations', quotationsRouter)
router.use('/credit-notes', creditNotesRouter)
router.use('/debit-notes', debitNotesRouter)
router.use('/recurring', recurringRouter)
router.use('/notifications', notificationsRouter)
router.use('/filings', filingsRouter)
router.use('/audit', auditRouter)
router.use('/attachments', attachmentsRouter)
router.use('/inventory', inventoryRouter)
router.use('/ca-clients', caClientsRouter)
router.use('/eway-bills', ewayBillsRouter)
router.use('/payment-gateway', paymentGatewayRouter)
router.use('/ai', aiRouter)

export default router
