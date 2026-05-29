import { Router } from 'express'
import { requireAuth, clerkClient } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { toJson } from '../lib/prisma.js'
import { ok, created, notFound, badRequest, forbidden } from '../lib/response.js'
import { generateId } from '../lib/id.js'
import { z } from 'zod'
import { config } from '../config.js'

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
    const authReq = req as unknown as AuthRequest
    const userId = authReq.userId // Owner ID
    const currentUserRole = authReq.role

    // Check permission
    if (!hasPermission(currentUserRole, 'user:view')) {
      return forbidden(res, 'Insufficient permissions to view users')
    }

    // Fetch active users from Clerk
    const allUsers = await clerkClient.users.getUserList()
    // Fetch pending invitations from Clerk
    const allInvitations = await clerkClient.invitations.getInvitationList()

    const activeUsers = allUsers.data
      .filter((u) => u.id === userId || (u.publicMetadata as any).ownerId === userId)
      .map((u) => ({
        id: u.id,
        email: u.emailAddresses[0]?.emailAddress || '',
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown User',
        role: (u.publicMetadata as any).role || 'owner',
        status: 'active',
        createdAt: new Date(u.createdAt).toISOString(),
      }))

    const pendingInvites = allInvitations.data
      .filter((i) => (i.publicMetadata as any).ownerId === userId && i.status === 'pending')
      .map((i) => ({
        id: i.id,
        email: i.emailAddress,
        name: (i.publicMetadata as any).name || 'Invited User',
        role: (i.publicMetadata as any).role || 'viewer',
        status: 'pending',
        createdAt: new Date(i.createdAt).toISOString(),
      }))

    ok(res, [...activeUsers, ...pendingInvites])
  } catch (err) {
    next(err)
  }
})

// POST /users/invite - Invite a team member
router.post('/invite', async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthRequest
    const userId = authReq.userId // Owner ID
    const clerkUserId = authReq.clerkUserId // Actual logged-in user
    const currentUserRole = authReq.role

    // Validate input
    const validated = inviteUserSchema.parse(req.body)

    // Check permission
    if (!hasPermission(currentUserRole, 'user:invite')) {
      return forbidden(res, 'Insufficient permissions to invite users')
    }

    // Get current user's business profile name
    const business = await prisma.businessProfile.findUnique({ where: { userId } })
    const businessName = business ? (business.data as any).businessName : 'the team'

    // Call Clerk to create invitation
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: validated.email,
      redirectUrl: `${config.FRONTEND_URL}/signup`,
      publicMetadata: {
        role: validated.role,
        ownerId: userId,
        name: validated.name || '',
        businessName,
      },
      ignoreExisting: true,
    })

    // Create audit log
    await prisma.auditEntry.create({
      data: {
        id: generateId(),
        userId: clerkUserId,
        entity: 'user',
        entityId: invitation.id,
        action: 'invite',
        data: toJson({
          email: validated.email,
          role: validated.role,
          name: validated.name,
        }),
      },
    })

    created(res, {
      invitationId: invitation.id,
      email: validated.email,
      role: validated.role,
      status: 'pending',
      message: 'Invitation sent successfully via Clerk.',
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
    const authReq = req as unknown as AuthRequest
    const userId = authReq.userId // Owner ID
    const clerkUserId = authReq.clerkUserId // Actual logged-in user
    const currentUserRole = authReq.role
    const targetUserId = req.params.targetUserId

    // Validate input
    const validated = updateRoleSchema.parse(req.body)

    // Check permission
    if (!hasPermission(currentUserRole, 'user:manage')) {
      return forbidden(res, 'Insufficient permissions to manage users')
    }

    // Cannot change owner role
    if (validated.role === 'owner' && currentUserRole !== 'owner') {
      return forbidden(res, 'Only owners can assign owner role')
    }

    // Get target user from Clerk
    const targetUser = await clerkClient.users.getUser(targetUserId)
    const targetMetadata = (targetUser.publicMetadata || {}) as { role?: string; ownerId?: string }

    if (targetMetadata.ownerId !== userId) {
      return forbidden(res, 'User does not belong to your team')
    }

    const oldRole = targetMetadata.role || 'viewer'

    // Update target user metadata in Clerk
    await clerkClient.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        ...targetMetadata,
        role: validated.role,
      },
    })

    // Audit log
    await prisma.auditEntry.create({
      data: {
        id: generateId(),
        userId: clerkUserId,
        entity: 'user',
        entityId: targetUserId,
        action: 'update_role',
        data: toJson({
          oldRole,
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

// DELETE /users/:userId - Remove team member or revoke invitation
router.delete('/:targetUserId', async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthRequest
    const userId = authReq.userId // Owner ID
    const clerkUserId = authReq.clerkUserId // Actual logged-in user
    const currentUserRole = authReq.role
    const targetUserId = req.params.targetUserId

    // Check permission
    if (!hasPermission(currentUserRole, 'user:remove')) {
      return forbidden(res, 'Insufficient permissions to remove users')
    }

    // Cannot remove yourself
    if (clerkUserId === targetUserId) {
      return badRequest(res, 'Cannot remove yourself')
    }

    let role = 'viewer'

    if (targetUserId.startsWith('inv_')) {
      // Revoke pending invitation
      const invitation = await clerkClient.invitations.revokeInvitation(targetUserId)
      role = (invitation.publicMetadata as any)?.role || 'viewer'
    } else {
      // Remove team member association by clearing Clerk metadata
      const targetUser = await clerkClient.users.getUser(targetUserId)
      const targetMetadata = (targetUser.publicMetadata || {}) as { role?: string; ownerId?: string }

      if (targetMetadata.ownerId !== userId) {
        return forbidden(res, 'User does not belong to your team')
      }

      role = targetMetadata.role || 'viewer'

      // Clear metadata
      await clerkClient.users.updateUserMetadata(targetUserId, {
        publicMetadata: {
          role: null,
          ownerId: null,
        },
      })
    }

    // Audit log
    await prisma.auditEntry.create({
      data: {
        id: generateId(),
        userId: clerkUserId,
        entity: 'user',
        entityId: targetUserId,
        action: 'remove',
        data: toJson({
          removedBy: clerkUserId,
          role,
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
