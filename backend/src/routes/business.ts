import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { enforceSingleUser } from '../middleware/singleUser.js'
import { prisma } from '../lib/prisma.js'
import { toJson } from '../lib/prisma.js'
import { ok, forbidden, badRequest, notFound } from '../lib/response.js'
import { uploadLogo, deleteLogo, uploadSignature, deleteSignature } from '../lib/cloudinary/index.js'

const router = Router()
router.use(requireAuth)

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, and SVG are allowed.'))
    }
  },
})

// GET /business
router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const record = await prisma.businessProfile.findUnique({ where: { userId } })
    ok(res, record ? record.data : null)
  } catch (err) { next(err) }
})

// PUT /business
router.put('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    // Check if this is a new profile creation (not an update)
    const existing = await prisma.businessProfile.findUnique({ where: { userId } })

    // Single-user enforcement (disabled for multi-user deployments)
    // To enable: set ENABLE_SINGLE_USER_MODE=true in environment
    if (!existing && process.env.ENABLE_SINGLE_USER_MODE === 'true') {
      const anyProfile = await prisma.businessProfile.findFirst()
      if (anyProfile) {
        return forbidden(res, 'Single-user MVP mode: Only one business account allowed per deployment')
      }
    }

    const record = await prisma.businessProfile.upsert({
      where: { userId },
      update: { data: toJson(req.body), updatedAt: new Date() },
      create: { id: `profile-${userId}`, userId, data: toJson(req.body) },
    })
    ok(res, record.data)
  } catch (err) { next(err) }
})

// POST /business/upload-logo
router.post('/upload-logo', upload.single('logo'), async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    if (!req.file) {
      return badRequest(res, 'No file uploaded')
    }

    // Upload to Cloudinary
    const logoUrl = await uploadLogo(req.file.buffer, userId)

    // Update BusinessProfile with logo URL nested inside profile
    const existing = await prisma.businessProfile.findFirst({ where: { userId } })
    if (!existing) {
      return notFound(res, 'Business profile not found')
    }

    const businessData = existing.data as any
    const profile = businessData.profile || {}
    const updatedProfile = { ...profile, logoUrl }
    const updated = { ...businessData, profile: updatedProfile }

    await prisma.businessProfile.update({
      where: { id: existing.id },
      data: { data: toJson(updated), updatedAt: new Date() },
    })

    ok(res, { logoUrl })
  } catch (err) {
    next(err)
  }
})

// DELETE /business/logo
router.delete('/logo', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    // Delete from Cloudinary
    await deleteLogo(userId).catch(() => {})

    // Update BusinessProfile to remove logo URL
    const existing = await prisma.businessProfile.findFirst({ where: { userId } })
    if (!existing) {
      return notFound(res, 'Business profile not found')
    }

    const businessData = existing.data as any
    const profile = businessData.profile || {}
    const updatedProfile = { ...profile, logoUrl: null }
    const updated = { ...businessData, profile: updatedProfile }

    await prisma.businessProfile.update({
      where: { id: existing.id },
      data: { data: toJson(updated), updatedAt: new Date() },
    })

    ok(res, { success: true })
  } catch (err) {
    next(err)
  }
})

// POST /business/upload-signature
router.post('/upload-signature', upload.single('signature'), async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    if (!req.file) {
      return badRequest(res, 'No file uploaded')
    }

    // Upload to Cloudinary
    const signatureUrl = await uploadSignature(req.file.buffer, userId)

    // Update BusinessProfile with signature URL nested inside profile
    const existing = await prisma.businessProfile.findFirst({ where: { userId } })
    if (!existing) {
      return notFound(res, 'Business profile not found')
    }

    const businessData = existing.data as any
    const profile = businessData.profile || {}
    const updatedProfile = { ...profile, signatureUrl }
    const updated = { ...businessData, profile: updatedProfile }

    await prisma.businessProfile.update({
      where: { id: existing.id },
      data: { data: toJson(updated), updatedAt: new Date() },
    })

    ok(res, { signatureUrl })
  } catch (err) {
    next(err)
  }
})

// DELETE /business/signature
router.delete('/signature', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    // Delete from Cloudinary
    await deleteSignature(userId).catch(() => {})

    // Update BusinessProfile to remove signature URL
    const existing = await prisma.businessProfile.findFirst({ where: { userId } })
    if (!existing) {
      return notFound(res, 'Business profile not found')
    }

    const businessData = existing.data as any
    const profile = businessData.profile || {}
    const updatedProfile = { ...profile, signatureUrl: null }
    const updated = { ...businessData, profile: updatedProfile }

    await prisma.businessProfile.update({
      where: { id: existing.id },
      data: { data: toJson(updated), updatedAt: new Date() },
    })

    ok(res, { success: true })
  } catch (err) {
    next(err)
  }
})

export default router
