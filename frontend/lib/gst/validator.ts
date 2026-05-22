import { VALID_STATE_CODES, STATE_CODES, GSTIN_REGEX, CHECKSUM_CHARS } from './constants'

export interface GSTINValidationResult {
  valid: boolean
  stateCode: string | null
  state: string | null
  pan: string | null
  entityType: string | null
  checksumValid: boolean
  error: string | null
}

function computeGSTINChecksum(gstin: string): string {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const charVal = CHECKSUM_CHARS.indexOf(gstin[i])
    const factor = i % 2 === 0 ? 1 : 2
    const product = charVal * factor
    sum += Math.floor(product / 36) + (product % 36)
  }
  const remainder = sum % 36
  return CHECKSUM_CHARS[(36 - remainder) % 36]
}

export function validateGSTIN(gstin: string): GSTINValidationResult {
  const g = gstin.trim().toUpperCase()

  if (!g) {
    return { valid: false, stateCode: null, state: null, pan: null, entityType: null, checksumValid: false, error: 'GSTIN is required' }
  }
  if (g.length !== 15) {
    return { valid: false, stateCode: null, state: null, pan: null, entityType: null, checksumValid: false, error: 'GSTIN must be 15 characters' }
  }
  if (!GSTIN_REGEX.test(g)) {
    return { valid: false, stateCode: null, state: null, pan: null, entityType: null, checksumValid: false, error: 'Invalid GSTIN format' }
  }

  const stateCode = g.substring(0, 2)
  if (!VALID_STATE_CODES.has(stateCode)) {
    return { valid: false, stateCode, state: null, pan: null, entityType: null, checksumValid: false, error: `Invalid state code: ${stateCode}` }
  }

  const pan = g.substring(2, 12)
  const entityType = g[12]
  const expectedChecksum = computeGSTINChecksum(g)
  const checksumValid = g[14] === expectedChecksum

  return {
    valid: checksumValid,
    stateCode,
    state: STATE_CODES[stateCode] || null,
    pan,
    entityType,
    checksumValid,
    error: checksumValid ? null : 'Invalid GSTIN checksum',
  }
}

export function determineSupplyType(sellerStateCode: string, buyerStateCode: string): 'intra' | 'inter' {
  // Treat missing or empty state codes as intra-state (safe default)
  if (typeof sellerStateCode !== 'string' || sellerStateCode.length < 2 ||
      typeof buyerStateCode !== 'string' || buyerStateCode.length < 2) return 'intra'
  return sellerStateCode === buyerStateCode ? 'intra' : 'inter'
}

export function extractStateCodeFromGSTIN(gstin: string): string | null {
  if (!gstin || gstin.length < 2) return null
  const code = gstin.substring(0, 2)
  return VALID_STATE_CODES.has(code) ? code : null
}
