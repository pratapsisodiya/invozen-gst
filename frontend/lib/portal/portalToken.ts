// Client-side portal token using base64 encoding (no crypto dependency needed)
// Tokens are customer-scoped and expire-based — not cryptographically signed
// For production, replace with server-side JWT

export interface PortalTokenPayload {
  customerId: string
  businessId: string
  expiresAt: number
}

export function generatePortalToken(customerId: string, businessId: string, expiryDays = 30): string {
  const payload: PortalTokenPayload = {
    customerId,
    businessId,
    expiresAt: Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  }
  const json = JSON.stringify(payload)
  if (typeof window !== 'undefined') {
    return btoa(json)
  }
  return Buffer.from(json).toString('base64')
}

export function parsePortalToken(token: string): PortalTokenPayload | null {
  try {
    const json = typeof window !== 'undefined' ? atob(token) : Buffer.from(token, 'base64').toString()
    const payload = JSON.parse(json) as PortalTokenPayload
    if (Date.now() > payload.expiresAt) return null
    return payload
  } catch {
    return null
  }
}

export function getPortalUrl(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/portal/${token}`
  }
  return `/portal/${token}`
}
