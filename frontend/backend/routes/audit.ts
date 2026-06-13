import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { toJson } from '../lib/prisma'
import { ok, created, badRequest } from '../lib/response'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { entity, entityId } = req.query as Record<string, string>

    const rows = await prisma.auditEntry.findMany({
      where: {
        userId,
        ...(entity ? { entity } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    ok(res, rows.map((r) => r.data))
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const body = req.body as Record<string, unknown>
    if (!body['id'] || !body['entity'] || !body['action']) {
      return badRequest(res, 'id, entity, and action are required')
    }

    const row = await prisma.auditEntry.create({
      data: {
        id: body['id'] as string,
        userId,
        entity: body['entity'] as string,
        entityId: (body['entityId'] as string) || '',
        action: body['action'] as string,
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

export default router
