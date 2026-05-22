import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { toJson } from '../lib/prisma.js'
import { ok, created, notFound, badRequest, forbidden } from '../lib/response.js'
import { generateId } from '../lib/id.js'
import { z } from 'zod'

const router = Router()
router.use(requireAuth)

/**
 * User Management Routes
 *
 * Handles team member invitations, role management, and permissions
 * for multi-user deployments.
 */

// Validation schemas
const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'accountant', 'ca', 'viewer']),
  name: z.string().min(1, 'Name is required').optional(),
})

const updateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'accountant', 'ca', 'viewer']),
})

/**
 * Role Permissions Matrix
 * Defines what each role can do in the system
 */
const ROLE_PERMISSIONS = {
  owner: [
    'user:manage', 'user:invite', 'user:remove',
    'invoice:create', 'invoice:edit', 'invoice:delete', 'invoice:view',
    'customer:manage', 'vendor:manage', 'item:manage',
    'payment:manage', 'expense:manage',
    'report:view', 'report:export',
    'settings:manage', 'billing:manage',
    'irn:generate', 'irn:cancel',
  ],
  admin: [
    'user:invite', 'user:view',
    'invoice:create', 'invoice:edit', 'invoice:delete', 'invoice:view',
    'customer:manage', 'vendor:manage', 'item:manage',
    'payment:manage', 'expense:manage',
    'report:view', 'report:export',
    'irn:generate', 'irn:cancel',
  ],
  accountant: [
    'invoice:create', 'invoice:edit', 'invoice:view',
    'customer:manage', 'vendor:manage', 'item:manage',
    'payment:manage', 'expense:manage',
    'report:view', 'report:export',
  ],
  ca: [
    'invoice:view', 'customer:view', 'vendor:view',
    'payment:view', 'expense:view',
    'report:view', 'report:export',
    'irn:generate',
  ],
  viewer: [
    'invoice:view', 'customer:view',
    'payment:view', 'report:view',
  ],
}

/**
 * Check if user has permission
 */
export function hasPermission(role: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || []
  return permissions.includes(permission)
}

// GET /users - List all team members
router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    // Get current user's business profile to determine role
    const business = await prisma.businessProfile.findUnique({ where: { userId } })
    if (!business) {
      return forbidden(res, 'Business profile not found')
    }

    const businessData = business.data as any
    const currentUserRole = businessData.role || 'owner' // First user is owner

    // Check permission
    if (!hasPermission(currentUserRole, 'user:view')) {
      return forbidden(res, 'Insufficient permissions to view users')
    }

    // In a real multi-tenant system, you'd query a Team or Workspace table
    // For now, return all business profiles (simplified for demo)
    const profiles = await prisma.businessProfile.findMany({
      select: {
        id: true,
        userId: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const users = profiles.map(p => {
      const data = p.data as any
      return {
        id: p.userId,
        email: data.email || '',
        name: data.businessName || data.name || 'Unknown',
        role: data.role || 'owner',
        status: data.status || 'active',
        createdAt: p.createdAt,
      }
    })

    ok(res, users)
  } catch (err) {
    next(err)
  }
})

// POST /users/invite - Invite a team member
router.post('/invite', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    // Validate input
    const validated = inviteUserSchema.parse(req.body)

    // Get current user's role
    const business = await prisma.businessProfile.findUnique({ where: { userId } })
    if (!business) {
      return forbidden(res, 'Business profile not found')
    }

    const businessData = business.data as any
    const currentUserRole = businessData.role || 'owner'

    // Check permission
    if (!hasPermission(currentUserRole, 'user:invite')) {
      return forbidden(res, 'Insufficient permissions to invite users')
    }

    // Create invitation record in notifications
    const invitation = await prisma.notification.create({
      data: {
        id: generateId(),
        userId, // Inviter
        type: 'user_invitation',
        isRead: false,
        data: toJson({
          email: validated.email,
          role: validated.role,
          name: validated.name,
          invitedBy: userId,
          invitedAt: new Date().toISOString(),
          status: 'pending',
          message: `You've been invited to join ${businessData.businessName || 'the team'} as ${validated.role}`,
        }),
      },
    })

    // In production, send email invitation here
    // await sendInvitationEmail(validated.email, invitation.id)

    created(res, {
      invitationId: invitation.id,
      email: validated.email,
      role: validated.role,
      status: 'pending',
      message: 'Invitation sent successfully. User will receive an email.',
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return badRequest(res, err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '))
    }
    next(err)
  }
})

// PUT /users/:userId/role - Update user role
router.put('/:targetUserId/role', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const targetUserId = req.params.targetUserId

    // Validate input
    const validated = updateRoleSchema.parse(req.body)

    // Get current user's role
    const business = await prisma.businessProfile.findUnique({ where: { userId } })
    if (!business) {
      return forbidden(res, 'Business profile not found')
    }

    const businessData = business.data as any
    const currentUserRole = businessData.role || 'owner'

    // Check permission
    if (!hasPermission(currentUserRole, 'user:manage')) {
      return forbidden(res, 'Insufficient permissions to manage users')
    }

    // Cannot change owner role
    if (validated.role === 'owner' && currentUserRole !== 'owner') {
      return forbidden(res, 'Only owners can assign owner role')
    }

    // Get target user's profile
    const targetBusiness = await prisma.businessProfile.findUnique({ where: { userId: targetUserId } })
    if (!targetBusiness) {
      return notFound(res, 'User not found')
    }

    const targetData = targetBusiness.data as any
    const updated = { ...targetData, role: validated.role, updatedAt: new Date().toISOString() }

    await prisma.businessProfile.update({
      where: { userId: targetUserId },
      data: { data: toJson(updated), updatedAt: new Date() },
    })

    // Audit log
    await prisma.auditEntry.create({
      data: {
        id: generateId(),
        userId,
        entity: 'user',
        entityId: targetUserId,
        action: 'update_role',
        data: toJson({
          oldRole: targetData.role || 'owner',
          newRole: validated.role,
        }),
      },
    })

    ok(res, {
      userId: targetUserId,
      role: validated.role,
      message: 'User role updated successfully',
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return badRequest(res, err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '))
    }
    next(err)
  }
})

// DELETE /users/:userId - Remove team member
router.delete('/:targetUserId', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const targetUserId = req.params.targetUserId

    // Get current user's role
    const business = await prisma.businessProfile.findUnique({ where: { userId } })
    if (!business) {
      return forbidden(res, 'Business profile not found')
    }

    const businessData = business.data as any
    const currentUserRole = businessData.role || 'owner'

    // Check permission
    if (!hasPermission(currentUserRole, 'user:remove')) {
      return forbidden(res, 'Insufficient permissions to remove users')
    }

    // Cannot remove yourself
    if (userId === targetUserId) {
      return badRequest(res, 'Cannot remove yourself')
    }

    // Get target user's profile
    const targetBusiness = await prisma.businessProfile.findUnique({ where: { userId: targetUserId } })
    if (!targetBusiness) {
      return notFound(res, 'User not found')
    }

    const targetData = targetBusiness.data as any

    // Cannot remove owner
    if (targetData.role === 'owner') {
      return forbidden(res, 'Cannot remove owner')
    }

    // Mark user as inactive instead of deleting
    const updated = { ...targetData, status: 'inactive', removedAt: new Date().toISOString() }

    await prisma.businessProfile.update({
      where: { userId: targetUserId },
      data: { data: toJson(updated), updatedAt: new Date() },
    })

    // Audit log
    await prisma.auditEntry.create({
      data: {
        id: generateId(),
        userId,
        entity: 'user',
        entityId: targetUserId,
        action: 'remove',
        data: toJson({
          removedBy: userId,
          role: targetData.role,
        }),
      },
    })

    ok(res, {
      message: 'User removed successfully',
    })
  } catch (err) {
    next(err)
  }
})

export default router
