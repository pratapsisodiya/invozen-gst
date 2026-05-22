import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Package, CreditCard, FileCheck, RefreshCw, ShoppingCart, Building2, FileMinus, Zap, Settings, Bell, Users2, Calendar, GitMerge } from 'lucide-react-native'
import { TopBar } from '@/components/layout/TopBar'
import { ServicesRoadmapBoard } from '@/components/services/ServicesRoadmapBoard'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { useAuthStore } from '@/stores/authStore'

const MENU_ITEMS = [
  { label: 'Compliance',   icon: Calendar,    path: '/compliance' },
  { label: 'ITC Recon',   icon: GitMerge,    path: '/itc-reconciliation' },
  { label: 'Items',        icon: Package,     path: '/items' },
  { label: 'Payments',     icon: CreditCard,  path: '/payments' },
  { label: 'Quotations',   icon: FileCheck,   path: '/quotations' },
  { label: 'Recurring',    icon: RefreshCw,   path: '/recurring' },
  { label: 'Purchases',    icon: ShoppingCart, path: '/purchases' },
  { label: 'Vendors',      icon: Building2,   path: '/vendors' },
  { label: 'Credit Notes', icon: FileMinus,   path: '/credit-notes' },
  { label: 'E-Invoice',    icon: Zap,         path: '/einvoice' },
  { label: 'Settings',     icon: Settings,    path: '/settings' },
  { label: 'Notifications', icon: Bell,       path: '/notifications' },
  { label: 'Accountant',   icon: Users2,      path: '/accountant' },
]

export default function MoreScreen() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  return (
    <View style={styles.root}>
      <TopBar title="More" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name?.[0] ?? 'U').toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>

        {/* Menu Grid */}
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Pressable
                key={item.path}
                style={({ pressed }) => [styles.gridItem, pressed && styles.gridItemPressed]}
                onPress={() => router.push(item.path as any)}
              >
                <View style={styles.gridIcon}>
                  <Icon size={20} color={Colors.brand600} />
                </View>
                <Text style={styles.gridLabel}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <ServicesRoadmapBoard
          eyebrow="Recommended Services"
          title="Where this workspace expands next"
          description="A CA-led roadmap of the services most businesses need after the core GST workflow is in place."
        />

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
          onPress={() => { logout(); router.replace('/login') }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { padding: 16, paddingBottom: 32 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#ffffff', borderRadius: Radius.xl,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 24, ...Shadow.sm,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.brand600,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userName:   { fontSize: 15, fontWeight: '600', color: Colors.text },
  userEmail:  { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  gridItem: {
    width: '22%',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm,
  },
  gridItemPressed: { backgroundColor: Colors.ink50 },
  gridIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.bgTinted,
    alignItems: 'center', justifyContent: 'center',
  },
  gridLabel: { fontSize: 11, fontWeight: '500', color: Colors.text2, textAlign: 'center' },

  signOut: {
    backgroundColor: Colors.err50 ?? '#fef2f2',
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 24,
    alignItems: 'center',
    borderWidth: 1, borderColor: Colors.err600 + '40',
  },
  signOutPressed: { opacity: 0.7 },
  signOutText:    { fontSize: 14, fontWeight: '600', color: Colors.err600 },
})
