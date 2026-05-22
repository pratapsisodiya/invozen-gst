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
    const { invoiceId, customerId } = req.query as Record<string, string>

    const rows = await prisma.payment.findMany({
      where: {
        userId,
        ...(invoiceId ? { invoiceId } : {}),
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
    if (!body['id'] || !body['invoiceId'] || !body['amount']) {
      return badRequest(res, 'id, invoiceId, and amount are required')
    }

    const row = await prisma.payment.create({
      data: {
        id: body['id'] as string,
        userId,
        invoiceId: body['invoiceId'] as string,
        customerId: body['customerId'] as string,
        paymentDate: body['paymentDate'] as string,
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.payment.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    await prisma.payment.delete({ where: { id: req.params['id'] } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

export default router
