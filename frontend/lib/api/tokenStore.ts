let tokenGetter: (() => Promise<string | null>) | null = null

export function registerTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter
}

export async function getBearerToken(): Promise<string | null> {
  if (!tokenGetter) return null
  return tokenGetter()
}
