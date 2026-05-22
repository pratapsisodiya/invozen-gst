// E-way Bill Validation and Business Logic

export interface EWayBillValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Validate GSTIN format
export function isValidGSTIN(gstin: string): boolean {
  if (!gstin) return false
  // GSTIN format: 2 digits (state) + 10 alphanumeric (PAN) + 1 digit (entity) + 1 letter (Z) + 1 alphanumeric (checksum)
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinRegex.test(gstin)
}

// Validate HSN code
export function isValidHSN(hsn: string): boolean {
  if (!hsn) return false
  // HSN can be 4, 6, or 8 digits
  return /^[0-9]{4}$|^[0-9]{6}$|^[0-9]{8}$/.test(hsn)
}

// Validate pincode
export function isValidPincode(pincode: string): boolean {
  if (!pincode) return false
  return /^[0-9]{6}$/.test(pincode)
}

// Calculate validity days based on distance
export function calculateValidity(distance: number, vehicleType: 'regular' | 'over_dimensional' = 'regular'): number {
  if (distance <= 0) return 0
  
  if (vehicleType === 'over_dimensional') {
    return Math.ceil(distance / 20) // 1 day per 20 km for over-dimensional
  }
  
  return Math.ceil(distance / 100) // 1 day per 100 km for regular
}

// Calculate valid upto date
export function calculateValidUpto(generatedDate: string, distance: number, vehicleType: 'regular' | 'over_dimensional' = 'regular'): string {
  const validityDays = calculateValidity(distance, vehicleType)
  const generated = new Date(generatedDate)
  generated.setDate(generated.getDate() + validityDays)
  return generated.toISOString()
}

// Check if E-way bill is required
export function isEWayBillRequired(
  totalValue: number,
  fromStateCode: string,
  toStateCode: string
): { required: boolean; reason: string } {
  // E-way bill not required if value <= 50,000
  if (totalValue <= 50000) {
    return {
      required: false,
      reason: 'E-way bill not required for consignment value ≤ ₹50,000'
    }
  }
  
  // Inter-state supply
  if (fromStateCode !== toStateCode) {
    return {
      required: true,
      reason: 'E-way bill mandatory for inter-state supply > ₹50,000'
    }
  }
  
  // Intra-state supply (most states require for > 50,000)
  return {
    required: true,
    reason: 'E-way bill mandatory for intra-state supply > ₹50,000'
  }
}

// Validate E-way bill data
export function validateEWayBill(data: any): EWayBillValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Transaction details
  if (!data.transactionType) errors.push('Transaction type is required')
  if (!data.subType) errors.push('Sub type is required')
  if (!data.docType) errors.push('Document type is required')
  if (!data.docNumber) errors.push('Document number is required')
  if (!data.docDate) errors.push('Document date is required')
  
  // Supplier details
  if (!data.fromGstin) {
    errors.push('Supplier GSTIN is required')
  } else if (!isValidGSTIN(data.fromGstin)) {
    errors.push('Invalid supplier GSTIN format')
  }
  
  if (!data.fromTradeName) errors.push('Supplier name is required')
  if (!data.fromAddress) errors.push('Supplier address is required')
  if (!data.fromPlace) errors.push('Supplier place is required')
  if (!data.fromPincode) {
    errors.push('Supplier pincode is required')
  } else if (!isValidPincode(data.fromPincode)) {
    errors.push('Invalid supplier pincode format')
  }
  if (!data.fromStateCode) errors.push('Supplier state code is required')
  
  // Recipient details
  if (!data.toTradeName) errors.push('Recipient name is required')
  if (!data.toAddress) errors.push('Recipient address is required')
  if (!data.toPlace) errors.push('Recipient place is required')
  if (!data.toPincode) {
    errors.push('Recipient pincode is required')
  } else if (!isValidPincode(data.toPincode)) {
    errors.push('Invalid recipient pincode format')
  }
  if (!data.toStateCode) errors.push('Recipient state code is required')
  
  // GSTIN validation for recipient (optional for B2C)
  if (data.toGstin && !isValidGSTIN(data.toGstin)) {
    errors.push('Invalid recipient GSTIN format')
  }
  
  // Product details
  if (!data.hsnCode) {
    errors.push('HSN code is required')
  } else if (!isValidHSN(data.hsnCode)) {
    errors.push('Invalid HSN code format (must be 4, 6, or 8 digits)')
  }
  
  if (!data.productName) errors.push('Product name is required')
  if (!data.quantity || data.quantity <= 0) errors.push('Valid quantity is required')
  if (!data.unit) errors.push('Unit of measurement is required')
  if (!data.totalValue || data.totalValue <= 0) errors.push('Total value must be greater than 0')
  if (!data.taxableAmount || data.taxableAmount <= 0) errors.push('Taxable amount must be greater than 0')
  
  // Transportation details
  if (!data.transportMode) errors.push('Transport mode is required')
  if (!data.distance || data.distance <= 0) errors.push('Distance must be greater than 0')
  
  // Vehicle number required for road transport
  if (data.transportMode === 'road' && !data.vehicleNumber) {
    warnings.push('Vehicle number is recommended for road transport')
  }
  
  // Business rule validations
  if (data.totalValue && data.totalValue <= 50000) {
    warnings.push('E-way bill may not be required for consignment value ≤ ₹50,000')
  }
  
  // Check if E-way bill is required based on state codes
  if (data.fromStateCode && data.toStateCode && data.totalValue) {
    const requirement = isEWayBillRequired(data.totalValue, data.fromStateCode, data.toStateCode)
    if (!requirement.required) {
      warnings.push(requirement.reason)
    }
  }
  
  // Distance validation
  if (data.distance > 4000) {
    warnings.push('Distance seems unusually high. Please verify.')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Validate cancellation request
export function validateCancellation(ewayBill: any): EWayBillValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (ewayBill.status !== 'active' && ewayBill.status !== 'extended') {
    errors.push('Only active or extended E-way bills can be cancelled')
  }
  
  if (!ewayBill.generatedDate) {
    errors.push('E-way bill must be generated before cancellation')
  } else {
    // Check 24-hour window
    const generatedTime = new Date(ewayBill.generatedDate).getTime()
    const now = new Date().getTime()
    const hoursSinceGeneration = (now - generatedTime) / (1000 * 60 * 60)
    
    if (hoursSinceGeneration > 24) {
      errors.push('E-way bill can only be cancelled within 24 hours of generation')
    } else if (hoursSinceGeneration > 20) {
      warnings.push(`Only ${Math.floor(24 - hoursSinceGeneration)} hours remaining to cancel`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Validate extension request
export function validateExtension(ewayBill: any): EWayBillValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (ewayBill.status !== 'active' && ewayBill.status !== 'extended') {
    errors.push('Only active or extended E-way bills can be extended')
  }
  
  if (ewayBill.extendedTimes >= 4) {
    errors.push('E-way bill can be extended maximum 4 times')
  }
  
  if (!ewayBill.validUpto) {
    errors.push('E-way bill must have a validity date')
  } else {
    const expiryTime = new Date(ewayBill.validUpto).getTime()
    const now = new Date().getTime()
    
    if (now >= expiryTime) {
      errors.push('Cannot extend an expired E-way bill')
    } else {
      const hoursUntilExpiry = (expiryTime - now) / (1000 * 60 * 60)
      if (hoursUntilExpiry > 8) {
        warnings.push('Extension is typically done closer to expiry time')
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Validate Part-B update
export function validatePartB(partBData: any): EWayBillValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!partBData.vehicleNumber) {
    errors.push('Vehicle number is required for Part-B')
  }
  
  if (!partBData.transportMode) {
    errors.push('Transport mode is required for Part-B')
  }
  
  if (!partBData.vehicleType) {
    errors.push('Vehicle type is required for Part-B')
  }
  
  if (partBData.transporter && partBData.transporter.gstin) {
    if (!isValidGSTIN(partBData.transporter.gstin)) {
      errors.push('Invalid transporter GSTIN format')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Get state code from GSTIN
export function getStateCodeFromGSTIN(gstin: string): string | null {
  if (!gstin || gstin.length < 2) return null
  return gstin.substring(0, 2)
}

// Check if supply is inter-state
export function isInterStateSupply(fromGstin: string, toGstin: string | null): boolean {
  if (!toGstin) return false // B2C might be intra or inter
  
  const fromState = getStateCodeFromGSTIN(fromGstin)
  const toState = getStateCodeFromGSTIN(toGstin)
  
  if (!fromState || !toState) return false
  
  return fromState !== toState
}

// Generate E-way bill number (mock - in production this comes from GST portal)
export function generateEWayBillNumber(): string {
  const timestamp = Date.now().toString().slice(-10)
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  return `${timestamp}${random}`
}

// Check if E-way bill is expired
export function isExpired(validUpto: string | null): boolean {
  if (!validUpto) return false
  return new Date(validUpto).getTime() < new Date().getTime()
}

// Check if E-way bill is expiring soon
export function isExpiringSoon(validUpto: string | null, hoursThreshold: number = 24): boolean {
  if (!validUpto) return false
  
  const expiryTime = new Date(validUpto).getTime()
  const now = new Date().getTime()
  const hoursUntilExpiry = (expiryTime - now) / (1000 * 60 * 60)
  
  return hoursUntilExpiry > 0 && hoursUntilExpiry <= hoursThreshold
}

// Get hours until expiry
export function getHoursUntilExpiry(validUpto: string | null): number | null {
  if (!validUpto) return null
  
  const expiryTime = new Date(validUpto).getTime()
  const now = new Date().getTime()
  const hours = (expiryTime - now) / (1000 * 60 * 60)
  
  return Math.max(0, Math.floor(hours))
}
