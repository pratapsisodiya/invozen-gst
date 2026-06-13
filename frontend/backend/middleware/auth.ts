import type { Request, Response, NextFunction } from 'express'
import { verifyToken, createClerkClient } from '@clerk/backend'
import { config } from '../config'

export interface AuthRequest extends Request {
  userId: string        // Tenant/Owner ID
  clerkUserId: string   // Actual logged-in Clerk user ID
  role: string          // Role of the actual user
}

export const clerkClient = createClerkClient({ secretKey: config.CLERK_SECRET_KEY })

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const token = authHeader.replace('Bearer ', '').trim()
  try {
    const payload = await verifyToken(token, { secretKey: config.CLERK_SECRET_KEY })
    const clerkUserId = payload.sub

    // Retrieve user details from Clerk to get role and ownerId from publicMetadata
    const user = await clerkClient.users.getUser(clerkUserId)
    const metadata = (user.publicMetadata || {}) as { role?: string; ownerId?: string }

    const role = metadata.role || 'owner'
    const ownerId = metadata.ownerId || clerkUserId

    const authReq = req as unknown as AuthRequest
    authReq.userId = ownerId
    authReq.clerkUserId = clerkUserId
    authReq.role = role

    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
