import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'expo-router'
import { FileText, Users, BarChart2, Bell } from 'lucide-react-native'
import { useAuthStore } from '@/stores/authStore'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { useCustomerStore } from '@/stores/customerStore'
import { seedMockData } from '@/lib/mock/seed'
import { formatCurrency } from '@/lib/utils/formatters'
import { KpiCard } from '@/components/ui/KpiCard'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme'

export default function DashboardScreen() {
  const { user } = useAuthStore()
  const router   = useRouter()
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
    { label: 'New Invoice',  icon: FileText,  path: '/invoices/new',   color: Colors.brand600 },
    { label: 'New Customer', icon: Users,     path: '/customers/new',  color: Colors.brand600 },
    { label: 'GST Reports',  icon: BarChart2, path: '/reports',        color: Colors.brand600 },
    { label: 'Reminders',    icon: Bell,      path: '/notifications',  color: Colors.brand600 },
  ]

  return (
    <View style={styles.root}>
      <TopBar
        title="Dashboard"
        right={
          <Button variant="primary" size="sm" onPress={() => router.push('/invoices/new' as any)}>
            New Invoice
          </Button>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <Text style={styles.greeting}>Good day, {user?.name ?? 'there'}</Text>
        <Text style={styles.period}>Month to date overview</Text>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiHalf}>
            <KpiCard title="Revenue" value={`₹${formatCurrency(kpis.revenue)}`} trend={{ value: 12, label: 'vs last' }} />
          </View>
          <View style={styles.kpiHalf}>
            <KpiCard title="Outstanding" value={`₹${formatCurrency(kpis.outstanding)}`} subtextColor={kpis.outstanding > 0 ? 'warn' : 'default'} />
          </View>
          <View style={styles.kpiHalf}>
            <KpiCard title="GST Collected" value={`₹${formatCurrency(kpis.gst)}`} trend={{ value: 8, label: 'vs last' }} />
          </View>
          <View style={styles.kpiHalf}>
            <KpiCard title="Overdue" value={`₹${formatCurrency(kpis.overdue)}`} subtextColor={kpis.overdue > 0 ? 'error' : 'default'} />
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <Pressable
                key={a.label}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                onPress={() => router.push(a.path as any)}
              >
                <View style={styles.actionIcon}>
                  <Icon size={18} color={Colors.brand600} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {/* Recent Invoices */}
        <Text style={styles.sectionTitle}>Recent Invoices</Text>
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
                <View style={styles.invoiceLeft}>
                  <Text style={styles.invoiceNum}>{inv.invoiceNumber}</Text>
                  <Text style={styles.invoiceCust}>{(inv as any).customerSnapshot?.name ?? (inv as any).customerName ?? ''}</Text>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmt}>₹{formatCurrency(inv.grandTotal)}</Text>
                  <StatusBadge status={inv.status} />
                </View>
              </Pressable>
            ))
          )}
          {invoices.length > 5 && (
            <Pressable style={styles.viewAll} onPress={() => router.push('/invoices' as any)}>
              <Text style={styles.viewAllText}>View all {invoices.length} invoices →</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bgWarm },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  greeting: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  period:   { fontSize: 13, color: Colors.textMuted, marginBottom: 20 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  kpiHalf: { width: '47.5%' },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 20, marginBottom: 12 },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgTinted,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.brand200 ?? Colors.border,
  },
  actionBtnPressed: { backgroundColor: Colors.brand100 ?? Colors.bgTinted },
  actionIcon: {
    width: 28, height: 28,
    borderRadius: Radius.md,
    backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '500', color: Colors.brand700 ?? Colors.brand600 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  invoiceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    justifyContent: 'space-between',
  },
  invoiceRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  invoiceRowPressed: { backgroundColor: Colors.ink50 },
  invoiceLeft:  { flex: 1 },
  invoiceNum:   { fontSize: 13, fontWeight: '600', color: Colors.brand600, fontVariant: ['tabular-nums'] },
  invoiceCust:  { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  invoiceRight: { alignItems: 'flex-end', gap: 4 },
  invoiceAmt:   { fontSize: 14, fontWeight: '600', color: Colors.text, fontVariant: ['tabular-nums'] },
  empty:   { padding: 24, textAlign: 'center', color: Colors.textMuted, fontSize: 14 },
  viewAll: { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  viewAllText: { fontSize: 13, color: Colors.brand600, fontWeight: '500' },
})
