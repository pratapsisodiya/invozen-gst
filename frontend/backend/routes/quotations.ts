import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { toJson } from '../lib/prisma'
import { ok, created, notFound, badRequest } from '../lib/response'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { status, customerId } = req.query as Record<string, string>

    const rows = await prisma.quotation.findMany({
      where: {
        userId,
        ...(status && status !== 'all' ? { status } : {}),
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    ok(res, rows.map((r) => r.data))
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const body = req.body as Record<string, unknown>
    if (!body['id'] || !body['quotationNumber']) return badRequest(res, 'id and quotationNumber are required')

    const row = await prisma.quotation.create({
      data: {
        id: body['id'] as string,
        userId,
        quotationNumber: body['quotationNumber'] as string,
        customerId: (body['customerId'] as string) || '',
        status: (body['status'] as string) || 'draft',
        quotationDate: (body['quotationDate'] as string) || '',
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const row = await prisma.quotation.findFirst({ where: { id: req.params['id'], userId } })
    if (!row) return notFound(res)
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.quotation.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), ...req.body, updatedAt: new Date().toISOString() }
    const m = merged as Record<string, unknown>
    const row = await prisma.quotation.update({
      where: { id: req.params['id'] },
      data: {
        customerId: m['customerId'] as string || existing.customerId,
        status: m['status'] as string || existing.status,
        quotationDate: m['quotationDate'] as string || existing.quotationDate,
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
    const existing = await prisma.quotation.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    await prisma.quotation.delete({ where: { id: req.params['id'] } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

// POST /quotations/:id/convert — convert quotation to invoice
router.post('/:id/convert', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const quotation = await prisma.quotation.findFirst({ where: { id: req.params['id'], userId } })
    if (!quotation) return notFound(res)

    const q = quotation.data as Record<string, unknown>
    const invoiceId = (req.body as Record<string, unknown>)['invoiceId'] as string
    const invoiceNumber = (req.body as Record<string, unknown>)['invoiceNumber'] as string
    if (!invoiceId || !invoiceNumber) return badRequest(res, 'invoiceId and invoiceNumber are required')

    const invoiceData = {
      ...q,
      id: invoiceId,
      invoiceNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      status: 'draft',
      sourceQuotationId: quotation.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          id: invoiceId,
          userId,
          invoiceNumber,
          customerId: quotation.customerId,
          status: 'draft',
          invoiceDate: invoiceData['invoiceDate'] as string,
          data: toJson(invoiceData),
        },
      }),
      prisma.quotation.update({
        where: { id: req.params['id'] },
        data: {
          status: 'converted',
          data: toJson({ ...q, status: 'converted', convertedInvoiceId: invoiceId, updatedAt: new Date().toISOString() }),
          updatedAt: new Date(),
        },
      }),
    ])

    created(res, invoice.data)
  } catch (err) { next(err) }
})

export default router
