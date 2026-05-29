import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { toJson } from '../lib/prisma.js'
import { ok, created, notFound, badRequest } from '../lib/response.js'
import { uploadAttachment, isCloudinaryConfigured } from '../lib/cloudinary/index.js'

const router = Router()
router.use(requireAuth)

router.get('/:entityId', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const rows = await prisma.attachment.findMany({
      where: { userId, entityId: req.params['entityId'] },
      orderBy: { createdAt: 'desc' },
    })
    ok(res, rows.map((r) => r.data))
  } catch (err) { next(err) }
})

router.post('/:entityId', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const body = req.body as Record<string, unknown>
    if (!body['id'] || !body['name'] || !body['data']) {
      return badRequest(res, 'id, name, and data (base64) are required')
    }

    const fileName = body['name'] as string
    const base64Data = body['data'] as string
    const entityId = req.params['entityId']

    let storedData = { ...body }

    // Upload to Cloudinary if configured; otherwise fall back to storing base64 in DB
    if (isCloudinaryConfigured) {
      try {
        const url = await uploadAttachment(base64Data, fileName, userId, entityId)
        storedData = { ...body, data: url, storageType: 'cloudinary', url }
      } catch (uploadErr) {
        console.error('[attachments] Cloudinary upload failed, falling back to DB storage:', uploadErr)
      }
    }

    const row = await prisma.attachment.create({
      data: {
        id: body['id'] as string,
        userId,
        entityId,
        data: toJson(storedData),
      },
    })
    created(res, row.data)
  } catch (err) { next(err) }
})

router.delete('/:entityId/:attachmentId', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.attachment.findFirst({
      where: { id: req.params['attachmentId'], userId, entityId: req.params['entityId'] },
    })
    if (!existing) return notFound(res)
    await prisma.attachment.delete({ where: { id: req.params['attachmentId'] } })
    ok(res, { deleted: true })
  } catch (err) { next(err) }
})

export default router
