import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import { FileText, Users, BarChart2, Bell, ChevronRight } from 'lucide-react-native'
import { useAuthStore } from '@/stores/authStore'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { useCustomerStore } from '@/stores/customerStore'
import { seedMockData } from '@/lib/mock/seed'
import { formatCurrency } from '@/lib/utils/formatters'
import { KpiCard } from '@/components/ui/KpiCard'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Colors, FontFamily, Radius, Shadow, Spacing } from '@/constants/theme'

function QuickActionButton({
  label, icon: Icon, color, bgColor, onPress, index,
}: {
  label: string
  icon: typeof FileText
  color: string
  bgColor: string
  onPress: () => void
  index: number
}) {
  const scale   = useSharedValue(1)
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(12)

  useEffect(() => {
    opacity.value    = withDelay(300 + index * 60, withSpring(1, { damping: 16 }))
    translateY.value = withDelay(300 + index * 60, withSpring(0, { damping: 16 }))
  }, [])

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }))

  return (
    <Animated.View style={[styles.actionWrap, containerStyle]}>
      <Pressable
        style={[styles.actionBtn, { backgroundColor: bgColor }]}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.92, { damping: 12 }) }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12 }) }}
      >
        <View style={[styles.actionIcon, { backgroundColor: color }]}>
          <Icon size={16} color="#fff" strokeWidth={2} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  )
}

export default function DashboardScreen() {
  const { user } = useAuthStore()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const invoices  = useInvoiceStore((s) => s.invoices)
  const customers = useCustomerStore((s) => s.customers)

  useEffect(() => { seedMockData() }, [])

  const kpis = useMemo(() => {
    const now = new Date()
    const cm = now.getMonth() + 1
    const cy = now.getFullYear()
    let revenue = 0, outstanding = 0, overdue = 0, gst = 0
    invoices.forEach((inv) => {
      const d = new Date(inv.invoiceDate)
      if (inv.status !== 'void' && d.getMonth() + 1 === cm && d.getFullYear() === cy) {
        revenue += inv.grandTotal
        gst     += inv.totalTax
      }
      if (inv.status === 'sent' || inv.status === 'overdue') outstanding += inv.balanceDue
      if (inv.status === 'overdue') overdue += inv.balanceDue
    })
    return { revenue, outstanding, overdue, gst }
  }, [invoices])

  const recentInvoices = useMemo(
    () => [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [invoices]
  )

  const quickActions = [
    { label: 'New Invoice',  icon: FileText,  path: '/invoices/new',  color: Colors.brand600, bgColor: Colors.brand50 },
    { label: 'New Customer', icon: Users,     path: '/customers/new', color: Colors.blue600,  bgColor: Colors.blue50 },
    { label: 'GST Reports',  icon: BarChart2, path: '/reports',       color: Colors.ok600,    bgColor: Colors.ok50 },
    { label: 'Reminders',    icon: Bell,      path: '/notifications', color: Colors.warn600,  bgColor: Colors.warn50 },
  ]

  const kpiConfigs = [
    { title: 'Revenue',     value: `₹${formatCurrency(kpis.revenue)}`,     accentColor: Colors.brand600, trend: { value: 12, label: 'vs last' } },
    { title: 'Outstanding', value: `₹${formatCurrency(kpis.outstanding)}`, accentColor: Colors.blue600,  subtextColor: (kpis.outstanding > 0 ? 'warn' : 'default') as any },
    { title: 'GST Collected', value: `₹${formatCurrency(kpis.gst)}`,       accentColor: Colors.ok600,    trend: { value: 8, label: 'vs last' } },
    { title: 'Overdue',     value: `₹${formatCurrency(kpis.overdue)}`,     accentColor: Colors.err600,   subtextColor: (kpis.overdue > 0 ? 'error' : 'default') as any },
  ]

  return (
    <View style={styles.root}>
      <TopBar
        title="Dashboard"
        right={
          <Button variant="primary" size="sm" onPress={() => router.push('/invoices/new' as any)}>
            + Invoice
          </Button>
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
            <Text style={styles.period}>Month-to-date overview · May 2026</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.avatarInitials ?? 'DU'}</Text>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {kpiConfigs.map((k, i) => (
            <View key={k.title} style={styles.kpiHalf}>
              <KpiCard
                title={k.title}
                value={k.value}
                accentColor={k.accentColor}
                trend={k.trend}
                subtextColor={k.subtextColor}
                index={i}
              />
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {quickActions.map((a, i) => (
            <QuickActionButton
              key={a.label}
              label={a.label}
              icon={a.icon}
              color={a.color}
              bgColor={a.bgColor}
              onPress={() => router.push(a.path as any)}
              index={i}
            />
          ))}
        </View>

        {/* Recent Invoices */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Invoices</Text>
          {invoices.length > 0 && (
            <Pressable onPress={() => router.push('/invoices' as any)} style={styles.seeAll}>
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color={Colors.brand600} />
            </Pressable>
          )}
        </View>
        <View style={styles.card}>
          {recentInvoices.length === 0 ? (
            <Text style={styles.empty}>No invoices yet</Text>
          ) : (
            recentInvoices.map((inv, i) => (
              <Pressable
                key={inv.id}
                style={({ pressed }) => [
                  styles.invoiceRow,
                  i > 0 && styles.invoiceRowBorder,
                  pressed && styles.invoiceRowPressed,
                ]}
                onPress={() => router.push(`/invoices/${inv.id}` as any)}
              >
                <View style={styles.invoiceIconWrap}>
                  <FileText size={14} color={Colors.brand600} />
                </View>
                <View style={styles.invoiceLeft}>
                  <Text style={styles.invoiceNum}>{inv.invoiceNumber}</Text>
                  <Text style={styles.invoiceCust} numberOfLines={1}>
                    {(inv as any).customerSnapshot?.name ?? (inv as any).customerName ?? ''}
                  </Text>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmt}>₹{formatCurrency(inv.grandTotal)}</Text>
                  <StatusBadge status={inv.status} />
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bgWarm },
  scroll:  { flex: 1 },
  content: { padding: 16 },

  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  period: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#fff',
  },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  kpiHalf: { width: '47.5%' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  sectionTitle:  { fontSize: 14, fontFamily: FontFamily.semibold, color: Colors.text },
  seeAll:        { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText:    { fontSize: 13, fontFamily: FontFamily.medium, color: Colors.brand600 },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionWrap: { width: '47.5%' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontFamily: FontFamily.semibold, color: Colors.text, flex: 1 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  invoiceRowBorder:  { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderSoft },
  invoiceRowPressed: { backgroundColor: Colors.ink50 },
  invoiceIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceLeft:  { flex: 1 },
  invoiceNum:   { fontSize: 13, fontFamily: FontFamily.semibold, color: Colors.text, fontVariant: ['tabular-nums'] },
  invoiceCust:  { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 1 },
  invoiceRight: { alignItems: 'flex-end', gap: 4 },
  invoiceAmt:   { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.text, fontVariant: ['tabular-nums'] },
  empty: { padding: 28, textAlign: 'center', fontFamily: FontFamily.regular, color: Colors.textMuted, fontSize: 14 },
})
