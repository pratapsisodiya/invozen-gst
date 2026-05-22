import { getBearerToken } from './tokenStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Synthetic response that unwraps { data: T } from the standalone backend.
// This lets store code continue to call `res.json()` and get the raw value.
class UnwrappedResponse {
  ok: boolean
  status: number
  private _body: unknown

  constructor(ok: boolean, status: number, body: unknown) {
    this.ok = ok
    this.status = status
    this._body = body
  }

  async json() {
    // Backend wraps all success responses as { data: T }
    if (this._body && typeof this._body === 'object' && 'data' in (this._body as object)) {
      return (this._body as { data: unknown }).data
    }
    return this._body
  }
}

// Drop-in replacement for fetch() used inside Zustand stores.
// When NEXT_PUBLIC_API_URL is set it rewrites /api/X → <API_URL>/X,
// injects Clerk Bearer token, and unwraps { data: T } from the response.
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response | UnwrappedResponse> {
  if (!API_URL) return fetch(input, init)

  let url = typeof input === 'string' ? input : input.toString()
  if (url.startsWith('/api/')) {
    url = `${API_URL}/${url.slice('/api/'.length)}`
  }

  const token = await getBearerToken()
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> || {}),
  }
  if (!headers['Content-Type'] && init.body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { ...init, headers })
  const body = await res.json().catch(() => null)
  return new UnwrappedResponse(res.ok, res.status, body) as unknown as Response
}
