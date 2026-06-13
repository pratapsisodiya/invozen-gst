import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { irnLimiter } from '../middleware/rateLimit'
import { prisma } from '../lib/prisma'
import { toJson } from '../lib/prisma'
import { ok, created, notFound, badRequest } from '../lib/response'
import { NicIrpService } from '../lib/einvoice/nicIrp'
import { generateId } from '../lib/id'
import { createInvoiceSchema, updateInvoiceSchema, cancelIrnSchema } from '../lib/validation/invoice'
import { ZodError } from 'zod'
import { sendInvoiceEmail } from '../lib/email/index'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { status, customerId, dateFrom, dateTo, search } = req.query as Record<string, string>

    const rows = await prisma.invoice.findMany({
      where: {
        userId,
        ...(status && status !== 'all' ? { status } : {}),
        ...(customerId ? { customerId } : {}),
        ...(dateFrom || dateTo ? {
          invoiceDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    let data = rows.map((r) => r.data)
    if (search) {
      const q = search.toLowerCase()
      data = data.filter((i: unknown) => {
        const inv = i as Record<string, unknown>
        const snap = inv['customerSnapshot'] as Record<string, string> | undefined
        return (inv['invoiceNumber'] as string)?.toLowerCase().includes(q) ||
          snap?.['name']?.toLowerCase().includes(q)
      })
    }
    ok(res, data)
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const body = req.body as Record<string, unknown>

    const parsed = createInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return badRequest(res, msg)
    }

    const row = await prisma.invoice.create({
      data: {
        id: parsed.data.id,
        userId,
        invoiceNumber: parsed.data.invoiceNumber,
        customerId: parsed.data.customerId,
        status: parsed.data.status,
        invoiceDate: parsed.data.invoiceDate,
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const row = await prisma.invoice.findFirst({ where: { id: (req.params['id'] as string), userId } })
    if (!row) return notFound(res)
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.invoice.findFirst({ where: { id: (req.params['id'] as string), userId } })
    if (!existing) return notFound(res)

    const parsed = updateInvoiceSchema.safeParse(req.body)
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return badRequest(res, msg)
    }

    const merged = { ...(existing.data as object), ...parsed.data, updatedAt: new Date().toISOString() }
    const m = merged as Record<string, unknown>
    const row = await prisma.invoice.update({
      where: { id: (req.params['id'] as string) },
      data: {
        invoiceNumber: (m['invoiceNumber'] as string) || existing.invoiceNumber,
        customerId: (m['customerId'] as string) || existing.customerId,
        status: (m['status'] as string) || existing.status,
        invoiceDate: (m['invoiceDate'] as string) || existing.invoiceDate,
        data: toJson(merged),
        updatedAt: new Date(),
      },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.invoice.findFirst({ where: { id: (req.params['id'] as string), userId } })
    if (!existing) return notFound(res)
    await prisma.invoice.delete({ where: { id: (req.params['id'] as string) } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

// POST /invoices/bulk
router.post('/bulk', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { action, ids, status } = req.body as { action: string; ids: string[]; status?: string }

    if (!Array.isArray(ids) || ids.length === 0) return badRequest(res, 'ids array is required')

    if (action === 'updateStatus') {
      if (!status) return badRequest(res, 'status is required for updateStatus action')
      const now = new Date().toISOString()
      let updated = 0
      for (const id of ids) {
        const row = await prisma.invoice.findFirst({ where: { id, userId } })
        if (!row) continue
        const merged = { ...(row.data as object), status, updatedAt: now }
        await prisma.invoice.update({ where: { id }, data: { status, data: toJson(merged), updatedAt: new Date() } })
        updated++
      }
      ok(res, { updated })
    } else if (action === 'delete') {
      const result = await prisma.invoice.deleteMany({ where: { id: { in: ids }, userId } })
      ok(res, { deleted: result.count })
    } else {
      badRequest(res, `Unknown action: ${action}`)
    }
  } catch (err) { next(err) }
})

// POST /invoices/:id/generate-irn
router.post('/:id/generate-irn', irnLimiter, async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const invoice = await prisma.invoice.findFirst({ where: { id: (req.params['id'] as string), userId } })
    if (!invoice) return notFound(res)

    const invoiceData = invoice.data as any

    // Validation: Only for B2B invoices >= ₹5 lakhs
    if (!invoiceData.customerSnapshot?.gstin) {
      return badRequest(res, 'E-invoice requires customer GSTIN (B2B only)')
    }
    if (invoiceData.grandTotal < 500000) {
      return badRequest(res, 'E-invoice mandatory for invoices ≥ ₹5 lakhs only')
    }
    if (invoiceData.irnStatus === 'generated') {
      return badRequest(res, 'IRN already generated for this invoice')
    }

    // Generate IRN via NIC IRP
    const nicService = new NicIrpService()
    const irnResponse = await nicService.generateIrn(invoiceData)

    // Update invoice with IRN data
    const updated = {
      ...invoiceData,
      irnNumber: irnResponse.irnNumber,
      irnStatus: 'generated',
      irnAckNo: irnResponse.ackNo,
      irnAckDate: irnResponse.ackDate,
      irnQrCode: irnResponse.signedQrCode,
      irnSignedInvoice: irnResponse.signedInvoice,
      updatedAt: new Date().toISOString(),
    }

    await prisma.invoice.update({
      where: { id: (req.params['id'] as string) },
      data: { data: toJson(updated), updatedAt: new Date() },
    })

    // Audit log
    await prisma.auditEntry.create({
      data: {
        id: generateId(),
        userId,
        entity: 'invoice',
        entityId: (req.params['id'] as string),
        action: 'generate_irn',
        data: toJson({
          irnNumber: irnResponse.irnNumber,
          ackNo: irnResponse.ackNo,
          ackDate: irnResponse.ackDate,
        }),
      },
    })

    ok(res, updated)
  } catch (err) {
    next(err)
  }
})

// POST /invoices/:id/cancel-irn
router.post('/:id/cancel-irn', irnLimiter, async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    // Validate input
    try {
      const validated = cancelIrnSchema.parse(req.body)
      var { reason, remarks } = validated
    } catch (validationErr) {
      if (validationErr instanceof ZodError) {
        return badRequest(res, validationErr.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '))
      }
      throw validationErr
    }

    const invoice = await prisma.invoice.findFirst({ where: { id: (req.params['id'] as string), userId } })
    if (!invoice) return notFound(res)

    const invoiceData = invoice.data as any
    if (!invoiceData.irnNumber) {
      return badRequest(res, 'No IRN to cancel')
    }
    if (invoiceData.irnStatus === 'cancelled') {
      return badRequest(res, 'IRN already cancelled')
    }

    // Cancel IRN via NIC IRP
    const nicService = new NicIrpService()
    await nicService.cancelIrn(invoiceData.irnNumber, reason, remarks)

    // Update invoice
    const updated = {
      ...invoiceData,
      irnStatus: 'cancelled',
      irnCancelDate: new Date().toISOString(),
      irnCancelReason: reason,
      irnCancelRemarks: remarks,
      updatedAt: new Date().toISOString(),
    }

    await prisma.invoice.update({
      where: { id: (req.params['id'] as string) },
      data: { data: toJson(updated), updatedAt: new Date() },
    })

    // Audit log
    await prisma.auditEntry.create({
      data: {
        id: generateId(),
        userId,
        entity: 'invoice',
        entityId: (req.params['id'] as string),
        action: 'cancel_irn',
        data: toJson({
          irnNumber: invoiceData.irnNumber,
          reason,
          remarks,
        }),
      },
    })

    ok(res, updated)
  } catch (err) {
    next(err)
  }
})

// POST /invoices/:id/send-email
router.post('/:id/send-email', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { to } = req.body as { to: string }

    if (!to) {
      return badRequest(res, 'Recipient email (to) is required')
    }

    // 1. Fetch invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params['id'], userId },
    })
    if (!invoice) {
      return notFound(res, 'Invoice not found')
    }

    // 2. Fetch business profile
    const profile = await prisma.businessProfile.findFirst({
      where: { userId },
    })
    if (!profile) {
      return badRequest(res, 'Business profile must be configured to send emails')
    }

    // 3. Send email using helper
    const invoiceData = invoice.data as any
    const businessData = profile.data as any

    const result = await sendInvoiceEmail(invoiceData, businessData, to)

    // 4. Update invoice status to 'sent' if it was 'draft'
    if (invoiceData.status === 'draft') {
      const merged = { ...invoiceData, status: 'sent', sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      await prisma.invoice.update({
        where: { id: req.params['id'] },
        data: {
          status: 'sent',
          data: toJson(merged),
          updatedAt: new Date(),
        },
      })
    }

    // 5. Audit Log Entry
    await prisma.auditEntry.create({
      data: {
        id: generateId(),
        userId,
        entity: 'invoice',
        entityId: req.params['id'],
        action: 'send_email',
        data: toJson({ to, result }),
      },
    })

    ok(res, result)
  } catch (err) {
    next(err)
  }
})

export default router
