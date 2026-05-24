import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { toJson } from '../lib/prisma.js'
import { ok, created, notFound, badRequest } from '../lib/response.js'

const router = Router()
router.use(requireAuth)

// GET /customers
router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { search, type } = req.query as Record<string, string>

    const rows = await prisma.customer.findMany({
      where: {
        userId,
        ...(type ? { businessType: type } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search } },
            { gstin: { contains: search } },
          ],
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    ok(res, rows.map((r) => r.data))
  } catch (err) { next(err) }
})

// POST /customers
router.post('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const body = req.body as Record<string, unknown>
    if (!body['id'] || !body['name']) return badRequest(res, 'id and name are required')

    const row = await prisma.customer.create({
      data: {
        id: body['id'] as string,
        userId,
        name: body['name'] as string,
        businessType: (body['businessType'] as string) || 'b2b',
        gstin: (body['gstin'] as string) || null,
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

// GET /customers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const row = await prisma.customer.findFirst({ where: { id: req.params['id'], userId } })
    if (!row) return notFound(res)
    ok(res, row.data)
  } catch (err) { next(err) }
})

// PUT /customers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.customer.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)

    const merged = { ...(existing.data as object), ...req.body }
    const row = await prisma.customer.update({
      where: { id: req.params['id'] },
      data: {
        name: (merged as Record<string, string>)['name'] || existing.name,
        businessType: (merged as Record<string, string>)['businessType'] || existing.businessType,
        gstin: (merged as Record<string, string>)['gstin'] || null,
        data: toJson(merged),
        updatedAt: new Date(),
      },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

// DELETE /customers/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.customer.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    await prisma.customer.delete({ where: { id: req.params['id'] } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

export default router
