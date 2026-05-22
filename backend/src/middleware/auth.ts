import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '@clerk/backend'
import { config } from '../config.js'

export interface AuthRequest extends Request {
  userId: string
}

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
    ;(req as unknown as AuthRequest).userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
