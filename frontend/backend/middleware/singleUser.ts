import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

/**
 * Single-User Enforcement Middleware
 *
 * For MVP launch, we only support one user per deployment.
 * This middleware checks if a BusinessProfile already exists.
 * If yes, it blocks new signups and shows an error message.
 *
 * This can be removed later when implementing multi-tenancy.
 */
export async function enforceSingleUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if any business profile exists
    const existingProfile = await prisma.businessProfile.findFirst()

    if (existingProfile) {
      res.status(403).json({
        error: 'Single-User MVP Mode',
        message: 'This deployment is currently configured for single-user access only. An account already exists.',
        code: 'SINGLE_USER_LIMIT_REACHED'
      })
      return
    }

    // No existing profile, allow signup
    next()
  } catch (error) {
    console.error('Single-user check failed:', error)
    // In case of error, allow the request to proceed
    // (better to allow signup than block legitimate users)
    next()
  }
}
