import { randomUUID } from 'crypto'

/**
 * Generate a unique ID using crypto.randomUUID()
 */
export function generateId(): string {
  return randomUUID()
}
