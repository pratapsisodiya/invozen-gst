import { Text } from 'react-native-paper'
import { formatCurrency } from '@/lib/utils/formatters'
import { TextStyle } from 'react-native'

interface AmountDisplayProps {
  amount: number
  style?: TextStyle
  variant?: 'default' | 'large' | 'small'
}

export function AmountDisplay({ amount, style, variant = 'default' }: AmountDisplayProps) {
  const getVariant = () => {
    switch (variant) {
      case 'large':
        return 'headlineMedium'
      case 'small':
        return 'bodySmall'
      default:
        return 'bodyLarge'
    }
  }

  return (
    <Text variant={getVariant() as any} style={style}>
      ₹{formatCurrency(amount)}
    </Text>
  )
}
