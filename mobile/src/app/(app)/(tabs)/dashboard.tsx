import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'expo-router'

export default function DashboardScreen() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.welcome}>
          Welcome back, {user?.name}! 👋
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Here's your business overview
        </Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <Card style={styles.kpiCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.kpiLabel}>
              Revenue (MTD)
            </Text>
            <Text variant="headlineMedium" style={styles.kpiValue}>
              ₹0
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.kpiCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.kpiLabel}>
              Outstanding
            </Text>
            <Text variant="headlineMedium" style={styles.kpiValue}>
              ₹0
            </Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.kpiRow}>
        <Card style={styles.kpiCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.kpiLabel}>
              Invoices
            </Text>
            <Text variant="headlineMedium" style={styles.kpiValue}>
              0
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.kpiCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.kpiLabel}>
              Customers
            </Text>
            <Text variant="headlineMedium" style={styles.kpiValue}>
              0
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Status Card */}
      <Card style={styles.statusCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.statusTitle}>
            🎉 Mobile App Setup Complete!
          </Text>
          <Text variant="bodyMedium" style={styles.statusBody}>
            Phase 1 Week 1 Foundation is complete:
          </Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checkmark}>✅</Text>
            <Text style={styles.checklistText}>
              Dependencies installed (16 packages)
            </Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkmark}>✅</Text>
            <Text style={styles.checklistText}>
              Shared code synced (20 files)
            </Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkmark}>✅</Text>
            <Text style={styles.checklistText}>
              Auth store migrated (AsyncStorage)
            </Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkmark}>✅</Text>
            <Text style={styles.checklistText}>Root layout with auth guard</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkmark}>✅</Text>
            <Text style={styles.checklistText}>
              Auth screens (login/signup)
            </Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkmark}>✅</Text>
            <Text style={styles.checklistText}>
              Bottom tab navigation (5 tabs)
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Button mode="outlined" onPress={handleLogout} style={styles.logoutButton}>
        Sign Out
      </Button>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF9F3',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  welcome: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
  },
  subtitle: {
    color: '#6B7280',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'white',
  },
  kpiLabel: {
    color: '#6B7280',
    marginBottom: 8,
  },
  kpiValue: {
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  statusCard: {
    backgroundColor: 'white',
    marginTop: 12,
    marginBottom: 24,
  },
  statusTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  statusBody: {
    marginBottom: 16,
    color: '#4B5563',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkmark: {
    marginRight: 8,
    fontSize: 16,
  },
  checklistText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 8,
  },
})
