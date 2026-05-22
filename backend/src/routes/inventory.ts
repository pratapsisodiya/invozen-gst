import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { toJson } from '../lib/prisma.js'
import { ok, created, notFound, badRequest } from '../lib/response.js'

const router = Router()
router.use(requireAuth)

router.get('/movements', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { itemId, type } = req.query as Record<string, string>

    const rows = await prisma.inventoryMovement.findMany({
      where: {
        userId,
        ...(itemId ? { itemId } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    ok(res, rows.map((r) => r.data))
  } catch (err) { next(err) }
})

router.post('/movements', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const body = req.body as Record<string, unknown>
    if (!body['id'] || !body['itemId'] || !body['type'] || body['quantity'] === undefined) {
      return badRequest(res, 'id, itemId, type, and quantity are required')
    }

    const quantity = Number(body['quantity'])
    const direction = (body['type'] as string) === 'in' ? quantity : -quantity

    const movement = await prisma.inventoryMovement.create({
      data: {
        id: body['id'] as string,
        userId,
        itemId: body['itemId'] as string,
        type: body['type'] as string,
        referenceType: (body['referenceType'] as string) || null,
        data: toJson(body),
      },
    })

    // update or create snapshot
    const snapshot = await prisma.inventorySnapshot.findFirst({
      where: { userId, itemId: body['itemId'] as string },
    })

    if (snapshot) {
      const currentQty = (snapshot.data as Record<string, unknown>)['quantity'] as number || 0
      const newQty = currentQty + direction
      const snapshotData = { ...(snapshot.data as object), quantity: newQty, updatedAt: new Date().toISOString() }
      await prisma.inventorySnapshot.update({
        where: { id: snapshot.id },
        data: { quantity: newQty, data: toJson(snapshotData), updatedAt: new Date() },
      })
    } else {
      const snapId = `snap-${body['itemId']}-${userId}`
      const snapshotData = {
        id: snapId,
        itemId: body['itemId'],
        quantity: direction,
        reorderPoint: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await prisma.inventorySnapshot.create({
        data: {
          id: snapId,
          userId,
          itemId: body['itemId'] as string,
          quantity: direction,
          data: toJson(snapshotData),
        },
      })
    }

    created(res, movement.data)
  } catch (err) { next(err) }
})

router.get('/snapshots', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const rows = await prisma.inventorySnapshot.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
    ok(res, rows.map((r) => r.data))
  } catch (err) { next(err) }
})

router.put('/reorder/:itemId', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { reorderPoint } = req.body as { reorderPoint: number }
    if (reorderPoint === undefined) return badRequest(res, 'reorderPoint is required')

    const snapshot = await prisma.inventorySnapshot.findFirst({
      where: { userId, itemId: req.params['itemId'] },
    })

    if (!snapshot) return notFound(res)
    const snapshotData = { ...(snapshot.data as object), reorderPoint, updatedAt: new Date().toISOString() }
    const row = await prisma.inventorySnapshot.update({
      where: { id: snapshot.id },
      data: { reorderPoint, data: toJson(snapshotData), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

export default router
