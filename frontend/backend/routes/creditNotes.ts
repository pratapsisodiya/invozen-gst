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

    const rows = await prisma.creditNote.findMany({
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
    if (!body['id']) return badRequest(res, 'id is required')

    const row = await prisma.creditNote.create({
      data: {
        id: body['id'] as string,
        userId,
        customerId: body['customerId'] as string,
        linkedInvoiceId: (body['linkedInvoiceId'] as string) || null,
        status: (body['status'] as string) || 'draft',
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const row = await prisma.creditNote.findFirst({ where: { id: req.params['id'], userId } })
    if (!row) return notFound(res)
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.creditNote.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), ...req.body, updatedAt: new Date().toISOString() }
    const m = merged as Record<string, unknown>
    const row = await prisma.creditNote.update({
      where: { id: req.params['id'] },
      data: {
        customerId: m['customerId'] as string || existing.customerId,
        status: m['status'] as string || existing.status,
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
    const existing = await prisma.creditNote.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    await prisma.creditNote.delete({ where: { id: req.params['id'] } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

// POST /credit-notes/:id/approve
router.post('/:id/approve', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.creditNote.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), status: 'approved', updatedAt: new Date().toISOString() }
    const row = await prisma.creditNote.update({
      where: { id: req.params['id'] },
      data: { status: 'approved', data: toJson(merged), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

export default router
