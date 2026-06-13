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
    const { search } = req.query as Record<string, string>
    const rows = await prisma.vendor.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    let data = rows.map((r) => r.data)
    if (search) {
      const q = search.toLowerCase()
      data = data.filter((v: unknown) => {
        const vendor = v as Record<string, string>
        return vendor['name']?.toLowerCase().includes(q) || vendor['gstin']?.toLowerCase().includes(q)
      })
    }
    ok(res, data)
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const body = req.body as Record<string, unknown>
    if (!body['id'] || !body['name']) return badRequest(res, 'id and name are required')
    const row = await prisma.vendor.create({
      data: {
        id: body['id'] as string,
        userId,
        name: body['name'] as string,
        gstin: (body['gstin'] as string) || null,
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const row = await prisma.vendor.findFirst({ where: { id: req.params['id'], userId } })
    if (!row) return notFound(res)
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.vendor.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), ...req.body }
    const m = merged as Record<string, unknown>
    const row = await prisma.vendor.update({
      where: { id: req.params['id'] },
      data: { name: m['name'] as string || existing.name, gstin: m['gstin'] as string || null, data: toJson(merged), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.vendor.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    await prisma.vendor.delete({ where: { id: req.params['id'] } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

export default router
