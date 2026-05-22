export interface BackupManifest {
  version: '1.0'
  createdAt: string
  businessName: string
  counts: Record<string, number>
}

export interface BackupData {
  manifest: BackupManifest
  stores: Record<string, unknown>
}

const STORE_KEYS = [
  'invozen-business',
  'invozen-invoices',
  'invozen-customers',
  'invozen-items',
  'invozen-payments',
  'invozen-purchases',
  'invozen-quotations',
  'invozen-recurring',
  'invozen-credit-notes',
  'invozen-expenses',
  'invozen-challans',
  'invozen-itc-reversals',
  'invozen-reminder-history',
  'invozen-audit',
  'invozen-notices',
  'invozen-notifications',
  'invozen-filing',
  'invozen-inventory',
  'invozen-tds',
]

function countEntries(storeData: unknown, storeKey: string): number {
  if (!storeData || typeof storeData !== 'object') return 0
  const data = storeData as Record<string, unknown>
  const state = data.state as Record<string, unknown> | undefined
  if (!state) return 0

  const listKey = storeKey
    .replace('invozen-', '')
    .replace('-', '_')

  // Try common array field names
  const candidates = [listKey + 's', listKey, 'invoices', 'customers', 'purchases', 'items', 'payments', 'challans', 'reversals', 'history']
  for (const c of candidates) {
    if (Array.isArray(state[c])) return (state[c] as unknown[]).length
  }
  return 0
}

export function createFullBackup(): Blob {
  const stores: Record<string, unknown> = {}
  const counts: Record<string, number> = {}

  for (const key of STORE_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        stores[key] = parsed
        counts[key] = countEntries(parsed, key)
      }
    } catch {
      // skip corrupted keys
    }
  }

  // Get business name
  let businessName = 'Unknown Business'
  try {
    const bizRaw = localStorage.getItem('invozen-business')
    if (bizRaw) {
      const biz = JSON.parse(bizRaw) as { state?: { settings?: { businessName?: string } } }
      businessName = biz?.state?.settings?.businessName || businessName
    }
  } catch { /* noop */ }

  const backup: BackupData = {
    manifest: {
      version: '1.0',
      createdAt: new Date().toISOString(),
      businessName,
      counts,
    },
    stores,
  }

  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
}

export function downloadBackup(): void {
  const blob = createFullBackup()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `invozen-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
  setLastBackupDate()
}

export async function validateBackup(file: File): Promise<{ valid: boolean; manifest?: BackupManifest; error?: string }> {
  try {
    const text = await file.text()
    const data = JSON.parse(text) as BackupData
    if (!data.manifest || !data.manifest.version || !data.stores) {
      return { valid: false, error: 'Invalid backup file format' }
    }
    if (data.manifest.version !== '1.0') {
      return { valid: false, error: `Unsupported backup version: ${data.manifest.version}` }
    }
    return { valid: true, manifest: data.manifest }
  } catch {
    return { valid: false, error: 'Could not parse backup file. Make sure it is a valid Invozen backup.' }
  }
}

export async function restoreFromBackup(file: File): Promise<{ success: boolean; message: string }> {
  const validation = await validateBackup(file)
  if (!validation.valid) {
    return { success: false, message: validation.error || 'Invalid backup' }
  }

  try {
    const text = await file.text()
    const data = JSON.parse(text) as BackupData

    // Clear existing invozen-* keys
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('invozen-')) keysToRemove.push(k)
    }
    for (const k of keysToRemove) localStorage.removeItem(k)

    // Write backup data
    for (const [key, value] of Object.entries(data.stores)) {
      localStorage.setItem(key, JSON.stringify(value))
    }

    setLastBackupDate()
    return { success: true, message: 'Restore successful. Reloading...' }
  } catch {
    return { success: false, message: 'Restore failed. Your existing data is unchanged.' }
  }
}

export function getLastBackupDate(): string | null {
  return localStorage.getItem('invozen-last-backup')
}

export function setLastBackupDate(): void {
  localStorage.setItem('invozen-last-backup', new Date().toISOString())
}

export function getBackupDaysAgo(): number | null {
  const last = getLastBackupDate()
  if (!last) return null
  const diff = Date.now() - new Date(last).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
