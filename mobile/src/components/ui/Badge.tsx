import { View, StyleSheet, ViewStyle } from 'react-native'
import { Text } from 'react-native-paper'

interface BadgeProps {
  label: string
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default'
  style?: ViewStyle
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: '#D1FAE5', text: '#065F46' }
      case 'warning':
        return { bg: '#FEF3C7', text: '#92400E' }
      case 'error':
        return { bg: '#FEE2E2', text: '#991B1B' }
      case 'info':
        return { bg: '#DBEAFE', text: '#1E40AF' }
      default:
        return { bg: '#F3F4F6', text: '#374151' }
    }
  }

  const colors = getColors()

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
})
