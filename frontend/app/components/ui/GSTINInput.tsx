'use client'
import { useState, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Input } from './Input'
import { validateGSTIN } from '@/lib/gst/validator'

interface GSTINInputProps {
  value: string
  onChange: (value: string) => void
  onValidated?: (result: { valid: boolean; state: string | null; stateCode: string | null; pan: string | null }) => void
  label?: string
  required?: boolean
  error?: string
}

export function GSTINInput({ value, onChange, onValidated, label = 'GSTIN', required, error }: GSTINInputProps) {
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateGSTIN> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase()
    onChange(val)
    if (val.length === 15) {
      setValidating(true)
      clearTimeout(timeoutRef.current ?? undefined)
      timeoutRef.current = setTimeout(() => {
        const result = validateGSTIN(val)
        setValidationResult(result)
        setValidating(false)
        onValidated?.({ valid: result.valid, state: result.state, stateCode: result.stateCode, pan: result.pan })
      }, 300)
    } else {
      clearTimeout(timeoutRef.current ?? undefined)
      setValidationResult(null)
    }
  }, [onChange, onValidated])

  const rightIcon = validating ? (
    <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
  ) : validationResult ? (
    validationResult.valid
      ? <CheckCircle className="w-4 h-4 text-ok-600" />
      : <XCircle className="w-4 h-4 text-err-600" />
  ) : null

  const helper = validationResult?.valid
    ? `✓ ${validationResult.state} — PAN: ${validationResult.pan}`
    : undefined

  return (
    <Input
      label={label}
      value={value}
      onChange={handleChange}
      placeholder="e.g. 27AAAPZ1234A1ZQ"
      maxLength={15}
      required={required}
      rightIcon={rightIcon}
      helper={helper}
      error={error || (validationResult && !validationResult.valid ? validationResult.error ?? undefined : undefined)}
    />
  )
}
