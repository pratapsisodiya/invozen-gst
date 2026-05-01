import { View, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {description && (
        <Text variant="bodyMedium" style={styles.description}>
          {description}
        </Text>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1F2937',
  },
  description: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24,
  },
  action: {
    marginTop: 8,
  },
})
