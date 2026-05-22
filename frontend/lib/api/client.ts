'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export type ApiResponse<T> = { data: T }

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string | null
): Promise<T> {
  const url = `${API_URL}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
  const json = await res.json() as { data: T }
  return json.data
}

// Hook-based client for use inside React components
export function useApiClient() {
  const { getToken } = useAuth()

  const request = useCallback(
    async <T>(path: string, options: RequestInit = {}): Promise<T> => {
      const token = await getToken()
      return apiFetch<T>(path, options, token)
    },
    [getToken]
  )

  return { request }
}

// Standalone function for use inside Zustand store actions
// Pass getToken from the component that triggers the action, or use a stored token
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  getToken: (() => Promise<string | null>) | null = null
): Promise<T> {
  const token = getToken ? await getToken() : null
  return apiFetch<T>(path, options, token)
}
