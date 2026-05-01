import { Text, StyleSheet, TextStyle } from 'react-native'
import { Colors } from '@/constants/theme'
import { formatCurrency } from '@/lib/utils/formatters'

type AmountSize = 'sm' | 'md' | 'lg'
type AmountColor = 'default' | 'warn' | 'error' | 'success' | 'muted' | 'brand'

interface AmountDisplayProps {
  amount: number
  size?: AmountSize
  color?: AmountColor
  showSymbol?: boolean
  style?: TextStyle
}

export function AmountDisplay({ amount, size = 'md', color = 'default', showSymbol = true, style }: AmountDisplayProps) {
  const colorMap: Record<AmountColor, string> = {
    default: Colors.text,
    warn:    Colors.warn600,
    error:   Colors.err600,
    success: Colors.ok600,
    muted:   Colors.textMuted,
    brand:   Colors.brand700,
  }

  const sizeMap: Record<AmountSize, TextStyle> = {
    sm: { fontSize: 13 },
    md: { fontSize: 14 },
    lg: { fontSize: 16, fontWeight: '600' },
  }

  return (
    <Text style={[styles.base, sizeMap[size], { color: colorMap[color] }, style]}>
      {showSymbol ? '₹' : ''}{formatCurrency(amount)}
    </Text>
  )
}

const styles = StyleSheet.create({
  base: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
})
