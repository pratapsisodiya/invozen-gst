import { NextResponse } from 'next/server'

/**
 * Health check endpoint for frontend Next.js application
 * Returns application status and backend connectivity
 */
export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    backend: {
      configured: !!backendUrl,
      url: backendUrl || 'not configured',
      reachable: false,
    },
    services: {
      clerk: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('your_'),
      groq: !!process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_'),
    },
  }

  // Check backend connectivity
  if (backendUrl) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

      const response = await fetch(`${backendUrl.replace('/api/v1', '')}/health`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        health.backend.reachable = true
      }
    } catch {
      // Backend not reachable - this is fine, just report status
      health.backend.reachable = false
    }
  }

  return NextResponse.json(health)
}
