import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import { config } from './config.js'
import apiRouter from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { apiLimiter } from './middleware/rateLimit.js'

export function createApp() {
  const app = express()

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for Clerk
  }))

  // CORS configuration
  const allowedOrigins = config.NODE_ENV === 'production'
    ? [config.FRONTEND_URL]
    : [config.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001']

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))

  app.use(express.json({ limit: '10mb' }))
  app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Apply rate limiting to all API routes
  app.use('/api/v1', apiLimiter)

  app.use('/api/v1', apiRouter)

  app.use(errorHandler)

  return app
}
