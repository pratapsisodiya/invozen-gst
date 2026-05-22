/**
 * Shared Backend API Client Utility
 * Provides common functions for calling backend API from Next.js API routes
 */

import { auth } from '@clerk/nextjs/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Makes an authenticated request to the backend API
 */
export async function backendFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const { userId, getToken } = await auth()

  if (!userId) {
    throw new APIError('Unauthorized', 401)
  }

  // Get the Clerk session token
  const token = await getToken()

  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new APIError(
      errorData.error || `HTTP ${response.status}`,
      response.status,
      errorData
    )
  }

  return response
}

/**
 * Makes a GET request to the backend API
 */
export async function backendGet<T = unknown>(endpoint: string): Promise<T> {
  const response = await backendFetch(endpoint, { method: 'GET' })
  return response.json()
}

/**
 * Makes a POST request to the backend API
 */
export async function backendPost<T = unknown>(
  endpoint: string,
  data: unknown
): Promise<T> {
  const response = await backendFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.json()
}

/**
 * Makes a PUT request to the backend API
 */
export async function backendPut<T = unknown>(
  endpoint: string,
  data: unknown
): Promise<T> {
  const response = await backendFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return response.json()
}

/**
 * Makes a DELETE request to the backend API
 */
export async function backendDelete<T = unknown>(endpoint: string): Promise<T> {
  const response = await backendFetch(endpoint, { method: 'DELETE' })
  return response.json()
}
