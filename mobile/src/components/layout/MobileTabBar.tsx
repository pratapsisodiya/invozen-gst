import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated'
import { LayoutDashboard, FileText, Plus, Users, Menu } from 'lucide-react-native'
import { useRouter, usePathname } from 'expo-router'
import { Colors, FontFamily, Shadow, TabBarHeight } from '@/constants/theme'

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

function AnimatedTab({ tab, active, onPress }: { tab: TabItem; active: boolean; onPress: () => void }) {
  const Icon = tab.icon
  const scale = useSharedValue(1)
  const dotOpacity = useSharedValue(active ? 1 : 0)

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dotOpacity.value, [0, 1], [0, 1]),
    transform: [{ scaleX: interpolate(dotOpacity.value, [0, 1], [0, 1]) }],
  }))

  if (dotOpacity.value !== (active ? 1 : 0)) {
    dotOpacity.value = withSpring(active ? 1 : 0, { damping: 18, stiffness: 200 })
  }

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.82, { damping: 12 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12 }) }}
    >
      <Animated.View style={[styles.tabIcon, iconStyle]}>
        <Icon size={22} color={active ? Colors.brand600 : Colors.textMuted} strokeWidth={active ? 2.2 : 1.8} />
      </Animated.View>
      <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
      <Animated.View style={[styles.activeDot, dotStyle]} />
    </Pressable>
  )
}

function FabButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1)
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <View style={styles.fabSlot}>
      <Animated.View style={fabStyle}>
        <Pressable
          style={styles.fab}
          onPress={onPress}
          onPressIn={() => { scale.value = withSpring(0.88, { damping: 12 }) }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 12 }) }}
        >
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </Pressable>
      </Animated.View>
    </View>
  )
}

export function MobileTabBar({ onFabPress }: MobileTabBarProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const insets   = useSafeAreaInsets()

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname.startsWith(path)
  }

  const handleFab = () => {
    if (onFabPress) onFabPress()
    else router.push('/invoices/new' as any)
  }

  const bottomPad = Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {TABS.slice(0, 2).map((tab) => (
        <AnimatedTab
          key={tab.path}
          tab={tab}
          active={isActive(tab.path)}
          onPress={() => router.push(tab.path as any)}
        />
      ))}

      <FabButton onPress={handleFab} />

      {TABS.slice(2).map((tab) => (
        <AnimatedTab
          key={tab.path}
          tab={tab}
          active={isActive(tab.path)}
          onPress={() => router.push(tab.path as any)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 8,
    paddingHorizontal: 4,
    ...Shadow.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    paddingVertical: 4,
  },
  tabIcon: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  label: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.brand600,
    fontFamily: FontFamily.semibold,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.brand600,
    marginTop: 2,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadow.lg,
  },
})
