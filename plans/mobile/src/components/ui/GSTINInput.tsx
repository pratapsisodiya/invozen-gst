import { useEffect, useRef, useState } from 'react'
import { Animated } from 'react-native'
import { CheckCircle, XCircle, Loader } from 'lucide-react-native'
import { Input } from './Input'
import { validateGSTIN } from '@/lib/gst/validator'
import { Colors } from '@/constants/theme'

interface GSTINInputProps {
  value: string
  onChange: (val: string) => void
  onValidated?: (result: { valid: boolean; state: string | null; stateCode: string | null; pan: string | null }) => void
  label?: string
  required?: boolean
  error?: string
}

export function GSTINInput({ value, onChange, onValidated, label = 'GSTIN', required, error }: GSTINInputProps) {
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [helperText, setHelperText] = useState<string>()
  const spinAnim = useRef(new Animated.Value(0)).current
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (value.length !== 15) {
      setStatus('idle')
      setHelperText(undefined)
      return
    }
    setStatus('validating')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const result = validateGSTIN(value)
      if (result.valid) {
        setStatus('valid')
        setHelperText(`✓ ${result.state} — PAN: ${result.pan}`)
        onValidated?.(result)
      } else {
        setStatus('invalid')
        setHelperText(undefined)
        onValidated?.({ valid: false, state: null, stateCode: null, pan: null })
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  useEffect(() => {
    if (status === 'validating') {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ).start()
    } else {
      spinAnim.stopAnimation()
      spinAnim.setValue(0)
    }
  }, [status])

  const getRightIcon = () => {
    if (status === 'validating') {
      const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
      return <Animated.View style={{ transform: [{ rotate: spin }] }}><Loader size={16} color={Colors.brand600} /></Animated.View>
    }
    if (status === 'valid')   return <CheckCircle size={16} color={Colors.ok600} />
    if (status === 'invalid') return <XCircle size={16} color={Colors.err600} />
    return undefined
  }

  return (
    <Input
      label={label}
      value={value}
      onChangeText={(text) => onChange(text.toUpperCase())}
      placeholder="e.g. 27AAAPZ1234A1ZQ"
      maxLength={15}
      autoCapitalize="characters"
      rightIcon={getRightIcon()}
      error={error || (status === 'invalid' ? 'Invalid GSTIN format' : undefined)}
      helper={helperText}
      required={required}
    />
  )
}
