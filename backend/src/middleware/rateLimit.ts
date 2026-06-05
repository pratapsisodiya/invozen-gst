import rateLimit from 'express-rate-limit'

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased for development
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Authentication endpoints rate limiter
 * Stricter limit: 50 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased for development
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * E-invoice (IRN) generation rate limiter
 * IRN generation is costly and should be limited
 * 50 requests per hour per IP
 */
export const irnLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { error: 'E-invoice generation limit exceeded, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
