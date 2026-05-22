'use client'
import { useEffect, useRef } from 'react'

interface ShortcutOptions {
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  preventDefault?: boolean
  disabled?: boolean
  allowInInputs?: boolean
}

export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: ShortcutOptions = {}
) {
  const callbackRef = useRef(callback)
  useEffect(() => { callbackRef.current = callback }, [callback])

  useEffect(() => {
    if (options.disabled) return
    const handler = (e: KeyboardEvent) => {
      if (!options.allowInInputs && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) return

      const metaMatch = options.meta ? (e.metaKey || e.ctrlKey) : (!e.metaKey && !e.ctrlKey)
      const ctrlMatch = options.ctrl ? e.ctrlKey : true
      const shiftMatch = options.shift ? e.shiftKey : true

      if (e.key === key && metaMatch && ctrlMatch && shiftMatch) {
        if (options.preventDefault) e.preventDefault()
        callbackRef.current(e)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key, options.meta, options.ctrl, options.shift, options.preventDefault, options.disabled, options.allowInInputs])
}

export function useKeySequence(
  sequence: string[],
  callback: () => void,
  timeoutMs = 500
) {
  const callbackRef = useRef(callback)
  useEffect(() => { callbackRef.current = callback }, [callback])

  const bufferRef = useRef<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (timerRef.current) clearTimeout(timerRef.current)
      bufferRef.current = [...bufferRef.current, e.key]

      if (bufferRef.current.length === sequence.length) {
        if (bufferRef.current.every((k, i) => k === sequence[i])) {
          callbackRef.current()
        }
        bufferRef.current = []
        return
      }

      timerRef.current = setTimeout(() => { bufferRef.current = [] }, timeoutMs)
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sequence, timeoutMs])
}
