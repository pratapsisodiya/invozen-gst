import { Router } from 'express'
import businessRouter from './business'
import usersRouter from './users'
import bulkRouter from './bulk'
import freelancerRouter from './freelancer'
import customersRouter from './customers'
import itemsRouter from './items'
import invoicesRouter from './invoices'
import paymentsRouter from './payments'
import vendorsRouter from './vendors'
import purchasesRouter from './purchases'
import expensesRouter from './expenses'
import quotationsRouter from './quotations'
import creditNotesRouter from './creditNotes'
import debitNotesRouter from './debitNotes'
import recurringRouter from './recurring'
import notificationsRouter from './notifications'
import filingsRouter from './filings'
import auditRouter from './audit'
import attachmentsRouter from './attachments'
import inventoryRouter from './inventory'
import caClientsRouter from './caClients'
import ewayBillsRouter from './ewayBills'
import paymentGatewayRouter from './paymentGateway'
import aiRouter from './ai'

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
