import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/logger.js'

interface PrismaClientKnownError extends Error {
  code?: string
  meta?: Record<string, unknown>
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    logger.warn({ method: req.method, path: req.path, validation: messages })
    res.status(400).json({ error: messages })
    return
  }

  const prismaErr = err as PrismaClientKnownError
  if (prismaErr?.code === 'P2002') {
    logger.warn({ method: req.method, path: req.path, error: 'Unique constraint violation' })
    res.status(409).json({ error: 'A record with this identifier already exists' })
    return
  }
  if (prismaErr?.code === 'P2025') {
    logger.warn({ method: req.method, path: req.path, error: 'Record not found' })
    res.status(404).json({ error: 'Record not found' })
    return
  }
  if (prismaErr?.code === 'P2003') {
    logger.warn({ method: req.method, path: req.path, error: 'Foreign key constraint violation' })
    res.status(422).json({ error: 'Referenced record does not exist' })
    return
  }

  const message = err instanceof Error ? err.message : 'Internal server error'
  logger.error({ method: req.method, path: req.path, error: message })
  res.status(500).json({ error: 'Internal server error' })
}
