/**
 * Backend Environment Variable Validation
 * Validates required environment variables on server startup
 */

import { config } from './config.js'

interface ValidationError {
  variable: string
  message: string
  helpUrl?: string
}

/**
 * Validate backend environment configuration
 * Throws detailed error if required variables are missing or invalid
 */
export function validateBackendEnv(): void {
  const errors: ValidationError[] = []

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    errors.push({
      variable: 'DATABASE_URL',
      message: 'Database connection string is required',
      helpUrl: 'https://www.prisma.io/docs/reference/database-reference/connection-urls',
    })
  } else if (process.env.DATABASE_URL.includes('user:password@localhost')) {
    errors.push({
      variable: 'DATABASE_URL',
      message: 'DATABASE_URL contains placeholder values. Please configure actual database credentials',
    })
  }

  // Validate CLERK_SECRET_KEY
  if (!config.CLERK_SECRET_KEY) {
    errors.push({
      variable: 'CLERK_SECRET_KEY',
      message: 'Clerk secret key is required for authentication',
      helpUrl: 'https://dashboard.clerk.com',
    })
  } else if (config.CLERK_SECRET_KEY === 'sk_test_placeholder' || config.CLERK_SECRET_KEY.includes('placeholder')) {
    errors.push({
      variable: 'CLERK_SECRET_KEY',
      message: 'CLERK_SECRET_KEY contains placeholder value. Please add your actual Clerk secret key from dashboard.clerk.com',
      helpUrl: 'https://dashboard.clerk.com',
    })
  }

  // Validate PORT
  const port = config.PORT
  if (isNaN(port) || port < 1024 || port > 65535) {
    errors.push({
      variable: 'PORT',
      message: `Invalid port number: ${port}. Must be between 1024 and 65535`,
    })
  }

  if (errors.length > 0) {
    const errorMessage = [
      '',
      '═══════════════════════════════════════════════════════════════',
      '  ⚠️  BACKEND ENVIRONMENT CONFIGURATION ERROR',
      '═══════════════════════════════════════════════════════════════',
      '',
      'The following environment variables need attention:',
      '',
      ...errors.flatMap(err => [
        `❌ ${err.variable}`,
        `   ${err.message}`,
        ...(err.helpUrl ? [`   Help: ${err.helpUrl}`] : []),
        '',
      ]),
      '─────────────────────────────────────────────────────────────',
      'Setup Instructions:',
      '─────────────────────────────────────────────────────────────',
      '',
      '1. Edit backend/.env file',
      '2. Replace placeholder values with actual credentials',
      '3. For SQLite development: DATABASE_URL="file:./invozen.db"',
      '4. For PostgreSQL: DATABASE_URL="postgresql://user:pass@localhost:5432/invozen"',
      '5. Get Clerk keys from: https://dashboard.clerk.com',
      '6. Restart the backend server',
      '',
      'For detailed setup instructions, see: backend/.env.example',
      '',
      '═══════════════════════════════════════════════════════════════',
      '',
    ].join('\n')

    throw new Error(errorMessage)
  }
}

/**
 * Check if environment is properly configured (non-throwing version)
 */
export function isBackendEnvConfigured(): boolean {
  try {
    validateBackendEnv()
    return true
  } catch {
    return false
  }
}

/**
 * Print environment status for debugging
 */
export function printEnvStatus(): void {
  console.log('\nEnvironment Configuration Status:')
  console.log('─────────────────────────────────────')
  console.log(`NODE_ENV: ${config.NODE_ENV}`)
  console.log(`PORT: ${config.PORT}`)
  console.log(`DATABASE_URL: ${config.DATABASE_URL ? '✓ Configured' : '✗ Missing'}`)
  console.log(`CLERK_SECRET_KEY: ${config.CLERK_SECRET_KEY && !config.CLERK_SECRET_KEY.includes('placeholder') ? '✓ Configured' : '✗ Missing or placeholder'}`)
  console.log(`FRONTEND_URL: ${config.FRONTEND_URL}`)
  console.log('─────────────────────────────────────\n')
}
