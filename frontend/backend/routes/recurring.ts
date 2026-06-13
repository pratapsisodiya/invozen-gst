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

    const rows = await prisma.recurringTemplate.findMany({
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

    const row = await prisma.recurringTemplate.create({
      data: {
        id: body['id'] as string,
        userId,
        customerId: body['customerId'] as string,
        status: (body['status'] as string) || 'active',
        nextGenerationDate: body['nextGenerationDate'] as string,
        data: toJson(body),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.get('/logs', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const rows = await prisma.recurringLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    ok(res, rows.map((r) => r.data))
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const row = await prisma.recurringTemplate.findFirst({ where: { id: req.params['id'], userId } })
    if (!row) return notFound(res)
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.recurringTemplate.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), ...req.body, updatedAt: new Date().toISOString() }
    const m = merged as Record<string, unknown>
    const row = await prisma.recurringTemplate.update({
      where: { id: req.params['id'] },
      data: {
        customerId: m['customerId'] as string || existing.customerId,
        status: m['status'] as string || existing.status,
        nextGenerationDate: m['nextGenerationDate'] as string || existing.nextGenerationDate,
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
    const existing = await prisma.recurringTemplate.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    await prisma.recurringTemplate.delete({ where: { id: req.params['id'] } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

router.post('/:id/pause', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.recurringTemplate.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const { reason } = req.body as { reason?: string }
    const merged = { ...(existing.data as object), status: 'paused', pauseReason: reason, updatedAt: new Date().toISOString() }
    const row = await prisma.recurringTemplate.update({
      where: { id: req.params['id'] },
      data: { status: 'paused', data: toJson(merged), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

router.post('/:id/resume', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.recurringTemplate.findFirst({ where: { id: req.params['id'], userId } })
    if (!existing) return notFound(res)
    const merged = { ...(existing.data as object), status: 'active', pauseReason: null, updatedAt: new Date().toISOString() }
    const row = await prisma.recurringTemplate.update({
      where: { id: req.params['id'] },
      data: { status: 'active', data: toJson(merged), updatedAt: new Date() },
    })
    ok(res, row.data)
  } catch (err) { next(err) }
})

// POST /recurring/:id/generate — create invoice from template now
router.post('/:id/generate', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const template = await prisma.recurringTemplate.findFirst({ where: { id: req.params['id'], userId } })
    if (!template) return notFound(res)

    const body = req.body as Record<string, unknown>
    const invoiceId = body['invoiceId'] as string
    const invoiceNumber = body['invoiceNumber'] as string
    if (!invoiceId || !invoiceNumber) return badRequest(res, 'invoiceId and invoiceNumber are required')

    const t = template.data as Record<string, unknown>
    const today = new Date().toISOString().split('T')[0]
    const invoiceData = {
      ...t,
      id: invoiceId,
      invoiceNumber,
      invoiceDate: today,
      status: 'draft',
      sourceTemplateId: template.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const logId = body['logId'] as string || `log-${Date.now()}`

    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          id: invoiceId,
          userId,
          invoiceNumber,
          customerId: template.customerId,
          status: 'draft',
          invoiceDate: today,
          data: toJson(invoiceData),
        },
      }),
      prisma.recurringLog.create({
        data: {
          id: logId,
          userId,
          templateId: template.id,
          invoiceId,
          data: toJson({ id: logId, templateId: template.id, invoiceId, generatedAt: new Date().toISOString() }),
        },
      }),
    ])

    created(res, invoice.data)
  } catch (err) { next(err) }
})

export default router
