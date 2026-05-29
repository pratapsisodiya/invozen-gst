import { useRef, useEffect } from 'react'
import { Animated, Pressable, View, Text, StyleSheet } from 'react-native'
import { Colors, Radius } from '@/constants/theme'

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, description, disabled, size = 'md' }: ToggleProps) {
  const translateX = useRef(new Animated.Value(checked ? (size === 'md' ? 20 : 16) : 2)).current

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: checked ? (size === 'md' ? 20 : 16) : 2,
      duration: 150,
      useNativeDriver: true,
    }).start()
  }, [checked, size])

  const trackW = size === 'md' ? 40 : 32
  const trackH = size === 'md' ? 20 : 16
  const thumbS = size === 'md' ? 16 : 12

  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      style={[styles.row, disabled && styles.disabled]}
    >
      <View style={[
        styles.track,
        { width: trackW, height: trackH, borderRadius: trackH / 2 },
        { backgroundColor: checked ? Colors.brand600 : Colors.ink300 },
      ]}>
        <Animated.View style={[
          styles.thumb,
          { width: thumbS, height: thumbS, borderRadius: thumbS / 2 },
          { transform: [{ translateX }] },
        ]} />
      </View>
      {(label || description) && (
        <View style={styles.labelBox}>
          {label && <Text style={styles.label}>{label}</Text>}
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  disabled:    { opacity: 0.5 },
  track:       { justifyContent: 'center' },
  thumb:       { backgroundColor: Colors.white, position: 'absolute', top: 2 },
  labelBox:    { flex: 1 },
  label:       { fontSize: 14, fontWeight: '500', color: Colors.text },
  description: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
})
