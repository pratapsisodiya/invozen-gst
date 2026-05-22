// Module-level singleton so Zustand stores (non-React context) can get the Clerk token.
// AppShell registers the getter once on mount; all stores read from it.

let _getToken: (() => Promise<string | null>) | null = null

export function registerTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn
}

export async function getBearerToken(): Promise<string | null> {
  return _getToken ? _getToken() : null
}
