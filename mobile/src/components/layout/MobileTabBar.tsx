import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { LayoutDashboard, FileText, Plus, Users, Menu } from 'lucide-react-native'
import { useRouter, usePathname } from 'expo-router'
import { Colors, Shadow, TabBarHeight } from '@/constants/theme'

interface TabItem {
  label: string
  icon: typeof LayoutDashboard
  path: string
}

const TABS: TabItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Invoices',  icon: FileText,        path: '/invoices' },
  { label: 'Customers', icon: Users,           path: '/customers' },
  { label: 'More',      icon: Menu,            path: '/more' },
]

interface MobileTabBarProps {
  onFabPress?: () => void
}

export function MobileTabBar({ onFabPress }: MobileTabBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname.startsWith(path)
  }

  const handleFab = () => {
    if (onFabPress) {
      onFabPress()
    } else {
      router.push('/invoices/new' as any)
    }
  }

  return (
    <View style={styles.container}>
      {/* First 2 tabs */}
      {TABS.slice(0, 2).map((tab) => {
        const active = isActive(tab.path)
        const Icon = tab.icon
        return (
          <Pressable
            key={tab.path}
            style={styles.tab}
            onPress={() => router.push(tab.path as any)}
          >
            <Icon size={22} color={active ? Colors.brand600 : Colors.textMuted} />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        )
      })}

      {/* Center FAB */}
      <View style={styles.fabSlot}>
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={handleFab}
        >
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Last 2 tabs */}
      {TABS.slice(2).map((tab) => {
        const active = isActive(tab.path)
        const Icon = tab.icon
        return (
          <Pressable
            key={tab.path}
            style={styles.tab}
            onPress={() => router.push(tab.path as any)}
          >
            <Icon size={22} color={active ? Colors.brand600 : Colors.textMuted} />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: TabBarHeight + (Platform.OS === 'ios' ? 20 : 0),
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    paddingHorizontal: 8,
    ...Shadow.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.brand600,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Shadow.lg,
  },
  fabPressed: {
    backgroundColor: Colors.brand700,
  },
})
