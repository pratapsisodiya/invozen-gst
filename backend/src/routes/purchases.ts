import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { toJson } from '../lib/prisma.js'
import { ok, created, notFound, badRequest } from '../lib/response.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { vendorId, status, itcStatus, dateFrom, dateTo } = req.query as Record<string, string>

    const rows = await prisma.purchaseInvoice.findMany({
      where: {
        userId,
        ...(vendorId ? { vendorId } : {}),
        ...(status && status !== 'all' ? { status } : {}),
        ...(itcStatus && itcStatus !== 'all' ? { itcStatus } : {}),
        ...(dateFrom || dateTo ? {
          invoiceDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        } : {}),
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
    if (!body['id']) return badRequest(res, 'id is required')
    const row = await prisma.purchaseInvoice.create({
      data: {
        id: body['id'] as string,
        userId,
        vendorId: body['vendorId'] as string,
        status: (body['status'] as string) || 'draft',
        itcStatus: (body['itcStatus'] as string) || 'eligible',
        invoiceDate: body['invoiceDate'] as string,
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const row = await prisma.purchaseInvoice.findFirst({ where: { id: req.params['id'], userId } })
    if (!row) return notFound(res)
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.purchaseInvoice.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), ...req.body, updatedAt: new Date().toISOString() }
    const m = merged as Record<string, unknown>
    const row = await prisma.purchaseInvoice.update({
      where: { id: req.params['id'] },
      data: {
        vendorId: m['vendorId'] as string || existing.vendorId,
        status: m['status'] as string || existing.status,
        itcStatus: m['itcStatus'] as string || existing.itcStatus,
        invoiceDate: m['invoiceDate'] as string || existing.invoiceDate,
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
    const existing = await prisma.purchaseInvoice.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    await prisma.purchaseInvoice.delete({ where: { id: req.params['id'] } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

// POST /purchases/:id/claim-itc
router.post('/:id/claim-itc', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.purchaseInvoice.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), itcStatus: 'claimed', updatedAt: new Date().toISOString() }
    const row = await prisma.purchaseInvoice.update({
      where: { id: req.params['id'] },
      data: { itcStatus: 'claimed', data: toJson(merged), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

export default router
