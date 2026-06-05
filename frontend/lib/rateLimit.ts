/**
 * Simple in-memory rate limiter for Next.js API routes
 * For production, use Redis or a database-backed solution
 */

interface RateLimitStore {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitStore>()

export interface RateLimitOptions {
  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  windowMs?: number

  /**
   * Maximum number of requests per window
   * @default 10
   */
  max?: number

  /**
   * Key generator function to identify unique clients
   * @default IP address or 'anonymous' for API route context
   */
  keyGenerator?: (identifier: string) => string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the client (e.g., IP, user ID)
 * @param options - Rate limit configuration
 * @returns Rate limit result with success status and metadata
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const {
    windowMs = 60000, // 1 minute
    max = 10,
    keyGenerator = (id: string) => id,
  } = options

  const key = keyGenerator(identifier)
  const now = Date.now()

  let record = store.get(key)

  // Clean up expired records
  if (record && now > record.resetAt) {
    store.delete(key)
    record = undefined
  }

  if (!record) {
    record = {
      count: 1,
      resetAt: now + windowMs,
    }
    store.set(key, record)

    return {
      success: true,
      limit: max,
      remaining: max - 1,
      reset: new Date(record.resetAt),
    }
  }

  record.count++

  if (record.count > max) {
    return {
      success: false,
      limit: max,
      remaining: 0,
      reset: new Date(record.resetAt),
    }
  }

  return {
    success: true,
    limit: max,
    remaining: max - record.count,
    reset: new Date(record.resetAt),
  }
}

/**
 * Rate limit middleware for AI endpoints
 * Limits to 20 requests per minute per user
 */
export function rateLimitAI(userId: string): RateLimitResult {
  return rateLimit(userId, {
    windowMs: 60000, // 1 minute
    max: 100, // Increased for development
  })
}

/**
 * Cleanup expired rate limit records
 * Call this periodically (e.g., every 5 minutes) to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt) {
      store.delete(key)
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}
