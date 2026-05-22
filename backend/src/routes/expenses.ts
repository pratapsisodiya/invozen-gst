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
    const { category, dateFrom, dateTo } = req.query as Record<string, string>

    const rows = await prisma.expense.findMany({
      where: {
        userId,
        ...(category && category !== 'all' ? { category } : {}),
        ...(dateFrom || dateTo ? {
          date: {
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

    const row = await prisma.expense.create({
      data: {
        id: body['id'] as string,
        userId,
        category: (body['category'] as string) || 'other',
        date: body['date'] as string,
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const row = await prisma.expense.findFirst({ where: { id: req.params['id'], userId } })
    if (!row) return notFound(res)
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.expense.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), ...req.body, updatedAt: new Date().toISOString() }
    const m = merged as Record<string, unknown>
    const row = await prisma.expense.update({
      where: { id: req.params['id'] },
      data: {
        category: m['category'] as string || existing.category,
        date: m['date'] as string || existing.date,
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
    const existing = await prisma.expense.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    await prisma.expense.delete({ where: { id: req.params['id'] } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

export default router
