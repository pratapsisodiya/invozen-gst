'use client'
import { useEffect, useRef, useState } from 'react'

export function useAutoSave<T>(
  key: string,
  data: T,
  isActive: boolean,
  intervalMs = 30_000
) {
  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [hasDraft] = useState(() => {
    try { return localStorage.getItem(key) !== null } catch { return false }
  })

  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => {
      try {
        localStorage.setItem(key, JSON.stringify(dataRef.current))
        setLastSavedAt(new Date())
      } catch { /* storage full or unavailable */ }
    }, intervalMs)
    return () => clearInterval(id)
  }, [key, isActive, intervalMs])

  const clearDraft = () => {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }

  const recoverDraft = (): T | null => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) as T : null
    } catch { return null }
  }

  return { lastSavedAt, hasDraft, clearDraft, recoverDraft }
}
