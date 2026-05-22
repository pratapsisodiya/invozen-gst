import type { Response } from 'express'
import type { ZodIssue } from 'zod'

export function ok<T>(res: Response, data: T): Response {
  return res.json({ data })
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ data })
}

export function notFound(res: Response, message = 'Not found'): Response {
  return res.status(404).json({ error: message })
}

export function badRequest(res: Response, message: string, details?: ZodIssue[]): Response {
  return res.status(400).json({ error: message, ...(details ? { details } : {}) })
}

export function unauthorized(res: Response): Response {
  return res.status(401).json({ error: 'Unauthorized' })
}

export function forbidden(res: Response, message = 'Forbidden'): Response {
  return res.status(403).json({ error: message })
}
