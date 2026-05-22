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
    const { status } = req.query as Record<string, string>

    const rows = await prisma.cAClient.findMany({
      where: {
        userId,
        ...(status && status !== 'all' ? { status } : {}),
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
    if (!body['id'] || !body['name']) return badRequest(res, 'id and name are required')

    const row = await prisma.cAClient.create({
      data: {
        id: body['id'] as string,
        userId,
        status: (body['status'] as string) || 'active',
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const row = await prisma.cAClient.findFirst({ where: { id: req.params['id'], userId } })
    if (!row) return notFound(res)
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.cAClient.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), ...req.body, updatedAt: new Date().toISOString() }
    const m = merged as Record<string, unknown>
    const row = await prisma.cAClient.update({
      where: { id: req.params['id'] },
      data: {
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
    const existing = await prisma.cAClient.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    await prisma.cAClient.delete({ where: { id: req.params['id'] } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

export default router
