import { createApp } from './app'
import { config } from './config'
import { logger } from './lib/logger'
import { prisma } from './lib/prisma'
import { createServer } from 'net'
import { validateBackendEnv, printEnvStatus } from './validateEnv'

const app = createApp()

/**
 * Check if port is available
 */
function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close()
      resolve(true)
    })
    server.listen(port)
  })
}

async function start() {
  try {
    // Validate environment configuration
    logger.info('Validating environment configuration...')
    validateBackendEnv()
    printEnvStatus()

    // Validate port availability
    const portAvailable = await checkPort(config.PORT)
    if (!portAvailable) {
      logger.error(`Port ${config.PORT} is already in use`)
      logger.info('Please stop the other process or change the PORT in .env')
      process.exit(1)
    }

    // Validate database connection
    logger.info('Connecting to database...')
    await prisma.$connect()

    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`
    logger.info('✓ Database connected successfully')

    // Start server
    app.listen(config.PORT, () => {
      logger.info(`✓ Server running on port ${config.PORT}`)
      logger.info(`✓ Environment: ${config.NODE_ENV}`)
      logger.info(`✓ API available at: http://localhost:${config.PORT}/api/v1`)
      logger.info(`✓ Health check: http://localhost:${config.PORT}/health`)
      logger.info('')
      logger.info('Server startup successful!')
    })
  } catch (err) {
    logger.error('Failed to start server:', err)
    logger.info('')
    logger.info('Troubleshooting:')
    logger.info('1. Check that DATABASE_URL in .env is correct')
    logger.info('2. For PostgreSQL: Ensure the database exists and is accessible')
    logger.info('3. For SQLite: Ensure the directory has write permissions')
    logger.info('4. Run: npm run db:migrate to create tables')
    process.exit(1)
  }
}

start()
