import type { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger.js'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : 'Internal server error'
  logger.error({ method: req.method, path: req.path, error: message })
  res.status(500).json({ error: 'Internal server error' })
}
