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
    const { unread, type } = req.query as Record<string, string>

    const rows = await prisma.notification.findMany({
      where: {
        userId,
        ...(unread === 'true' ? { isRead: false } : {}),
        ...(type ? { type } : {}),
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

    const row = await prisma.notification.create({
      data: {
        id: body['id'] as string,
        userId,
        type: (body['type'] as string) || 'info',
        isRead: false,
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id/read', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.notification.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), isRead: true, readAt: new Date().toISOString() }
    const row = await prisma.notification.update({
      where: { id: req.params['id'] },
      data: { isRead: true, data: toJson(merged), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.post('/read-all', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const unread = await prisma.notification.findMany({ where: { userId, isRead: false } })
    const now = new Date().toISOString()
    for (const n of unread) {
      const merged = { ...(n.data as object), isRead: true, readAt: now }
      await prisma.notification.update({
        where: { id: n.id },
        data: { isRead: true, data: toJson(merged), updatedAt: new Date() },
      })
    }
    ok(res, { updated: unread.length })
  } catch (err) { next(err) }
})

export default router
