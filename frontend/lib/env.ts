/**
 * Environment Variable Validation
 * Validates required environment variables on app startup
 */

interface EnvConfig {
  GROQ_API_KEY: string
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string
  CLERK_SECRET_KEY: string
  NEXT_PUBLIC_API_URL: string
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: string
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: string
}

/**
 * Validate and return environment configuration
 * Throws detailed error if required variables are missing
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = []

  // Check GROQ API Key
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('your_')) {
    errors.push(
      '❌ GROQ_API_KEY is missing or not configured\n' +
      '   Get your free API key at: https://console.groq.com/keys\n' +
      '   Add it to frontend/.env.local'
    )
  }

  // Check Clerk keys
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('your_')) {
    errors.push(
      '❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing or not configured\n' +
      '   Get your keys at: https://dashboard.clerk.com\n' +
      '   Add it to frontend/.env.local'
    )
  }

  if (!process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY.includes('your_')) {
    errors.push(
      '❌ CLERK_SECRET_KEY is missing or not configured\n' +
      '   Get your keys at: https://dashboard.clerk.com\n' +
      '   Add it to frontend/.env.local'
    )
  }

  // Check API URL
  if (!process.env.NEXT_PUBLIC_API_URL) {
    errors.push(
      '❌ NEXT_PUBLIC_API_URL is missing\n' +
      '   Should be: http://localhost:4000/api/v1 (development)\n' +
      '   Add it to frontend/.env.local'
    )
  }

  if (errors.length > 0) {
    const errorMessage = [
      '',
      '═══════════════════════════════════════════════════════════════',
      '  ⚠️  ENVIRONMENT CONFIGURATION ERROR',
      '═══════════════════════════════════════════════════════════════',
      '',
      'The following environment variables are missing or not configured:',
      '',
      ...errors,
      '',
      '─────────────────────────────────────────────────────────────',
      'Setup Instructions:',
      '─────────────────────────────────────────────────────────────',
      '',
      '1. Copy frontend/.env.local.example to frontend/.env.local',
      '2. Replace placeholder values with your actual API keys',
      '3. Restart the development server',
      '',
      'For detailed setup instructions, see: README.md',
      '',
      '═══════════════════════════════════════════════════════════════',
      '',
    ].join('\n')

    throw new Error(errorMessage)
  }

  return {
    GROQ_API_KEY: process.env.GROQ_API_KEY!,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/login',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/signup',
  }
}

/**
 * Check if environment is properly configured (non-throwing version)
 */
export function isEnvConfigured(): boolean {
  try {
    validateEnv()
    return true
  } catch {
    return false
  }
}

/**
 * Get environment configuration with helpful warnings
 */
export function getEnv(): Partial<EnvConfig> {
  return {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  }
}
