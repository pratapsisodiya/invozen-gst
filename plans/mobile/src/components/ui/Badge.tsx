import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { Colors, FontFamily, Radius } from '@/constants/theme'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  style?: ViewStyle
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  return (
    <View style={[styles.base, variantStyles[variant].container, style]}>
      <Text style={[styles.text, variantStyles[variant].text]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  text: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    letterSpacing: 0.2,
  },
})

const variantStyles: Record<BadgeVariant, { container: ViewStyle; text: any }> = {
  default: { container: { backgroundColor: Colors.brand50 },  text: { color: Colors.brand700 } },
  success: { container: { backgroundColor: Colors.ok50 },     text: { color: Colors.ok600 } },
  warning: { container: { backgroundColor: Colors.warn50 },   text: { color: Colors.warn600 } },
  error:   { container: { backgroundColor: Colors.err50 },    text: { color: Colors.err600 } },
  info:    { container: { backgroundColor: Colors.blue50 },   text: { color: Colors.blue600 } },
  neutral: { container: { backgroundColor: Colors.ink100 },   text: { color: Colors.ink500 } },
}
