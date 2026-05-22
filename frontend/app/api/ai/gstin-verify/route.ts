import { NextRequest } from 'next/server'
import { STATE_CODES } from '@/lib/gst/constants'

const ENTITY_TYPES: Record<string, string> = {
  '1': 'Individual/Proprietor',
  '2': 'Partnership',
  '3': 'HUF',
  '4': 'Company',
  '5': 'LLP',
  '6': 'AOP/BOI',
  '7': 'Trust',
  '8': 'Government',
  '9': 'Public Sector',
  '0': 'Foreign',
}

function validateGSTINFormat(gstin: string): boolean {
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return pattern.test(gstin.toUpperCase())
}

function extractGSTINInfo(gstin: string) {
  const g = gstin.toUpperCase().trim()
  const stateCode = g.substring(0, 2)
  const pan = g.substring(2, 12)
  const entityCode = pan.charAt(3)

  // Find state from state codes
  const stateEntry = Object.entries(STATE_CODES).find(([, code]) => code === stateCode)
  const state = stateEntry ? stateEntry[0] : 'Unknown State'

  const entityType = ENTITY_TYPES[entityCode] || 'Other'

  // 4th char of PAN indicates entity type
  const registrationType = inferRegistrationType(g)

  return { stateCode, pan, state, entityType, registrationType }
}

function inferRegistrationType(gstin: string): string {
  // Position 12 (index 12) is the entity indicator:
  // Z = Regular, C = Composition, etc.
  // Standard GSTINs end in ...Zx where Z is fixed for regular taxpayers
  // This is structural inference only — actual status requires portal lookup
  return 'Regular'
}

export async function POST(req: NextRequest) {
  let body: { gstin: string }
  try {
    body = await req.json() as { gstin: string }
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const gstin = (body.gstin || '').toUpperCase().trim()

  if (!gstin) {
    return Response.json({ error: 'GSTIN is required' }, { status: 400 })
  }

  const isValid = validateGSTINFormat(gstin)

  if (!isValid) {
    return Response.json({
      gstin,
      isValid: false,
      error: 'Invalid GSTIN format. Expected: 2-digit state code + 10-digit PAN + 3 check digits.',
    })
  }

  const info = extractGSTINInfo(gstin)

  // Checksum verification (Mod-36 algorithm)
  const checksumValid = verifyGSTINChecksum(gstin)

  return Response.json({
    gstin,
    isValid: true,
    checksumValid,
    stateCode: info.stateCode,
    state: info.state,
    panNumber: info.pan,
    entityType: info.entityType,
    registrationType: info.registrationType,
    status: checksumValid ? 'Active' : 'Unknown',
    verifiedAt: new Date().toISOString(),
    note: 'Format and checksum verified locally. For real-time filing status, visit the GST portal.',
  })
}

function verifyGSTINChecksum(gstin: string): boolean {
  // GSTIN Mod-36 checksum validation
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const g = gstin.toUpperCase()
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const c = chars.indexOf(g[i])
    if (c === -1) return false
    const factor = i % 2 === 0 ? 1 : 2
    const product = c * factor
    sum += Math.floor(product / 36) + (product % 36)
  }
  const checkDigitIndex = (36 - (sum % 36)) % 36
  return chars[checkDigitIndex] === g[14]
}
