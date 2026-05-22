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
    const { period, type } = req.query as Record<string, string>

    const rows = await prisma.filingRecord.findMany({
      where: {
        userId,
        ...(period ? { period } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    ok(res, rows.map((r) => r.data))
  } catch (err) { next(err) }
})

// POST /filings/get-or-create
router.post('/get-or-create', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const body = req.body as Record<string, unknown>
    const { type, period, id } = body as { type: string; period: string; id?: string }
    if (!type || !period) return badRequest(res, 'type and period are required')

    const existing = await prisma.filingRecord.findFirst({ where: { userId, type, period } })
    if (existing) return ok(res, existing.data)

    if (!id) return badRequest(res, 'id is required when creating')
    const now = new Date().toISOString()
    const data = {
      id,
      type,
      period,
      status: 'pending',
      checklist: [],
      notes: '',
      createdAt: now,
      updatedAt: now,
      ...body,
    }
    const row = await prisma.filingRecord.create({
      data: { id, userId, type, period, status: 'pending', data: toJson(data) },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id/status', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.filingRecord.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const { status } = req.body as { status: string }
    if (!status) return badRequest(res, 'status is required')
    const merged = { ...(existing.data as object), status, updatedAt: new Date().toISOString() }
    const row = await prisma.filingRecord.update({
      where: { id: req.params['id'] },
      data: { status, data: toJson(merged), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id/checklist/:itemId', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.filingRecord.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)

    const d = existing.data as Record<string, unknown>
    const checklist = (d['checklist'] as Array<Record<string, unknown>>) || []
    const { completed } = req.body as { completed: boolean }
    const updated = checklist.map((item) =>
      item['id'] === req.params['itemId'] ? { ...item, completed } : item
    )
    const merged = { ...d, checklist: updated, updatedAt: new Date().toISOString() }
    const row = await prisma.filingRecord.update({
      where: { id: req.params['id'] },
      data: { data: toJson(merged), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id/checklist', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.filingRecord.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const { checklist } = req.body as { checklist: unknown[] }
    if (!Array.isArray(checklist)) return badRequest(res, 'checklist must be an array')
    const d = existing.data as Record<string, unknown>
    const merged = { ...d, checklist, updatedAt: new Date().toISOString() }
    const row = await prisma.filingRecord.update({
      where: { id: req.params['id'] },
      data: { data: toJson(merged), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id/notes', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.filingRecord.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const { notes } = req.body as { notes: string }
    const d = existing.data as Record<string, unknown>
    const merged = { ...d, notes, updatedAt: new Date().toISOString() }
    const row = await prisma.filingRecord.update({
      where: { id: req.params['id'] },
      data: { data: toJson(merged), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

export default router
