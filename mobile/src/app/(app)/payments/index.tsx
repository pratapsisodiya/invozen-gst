import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { usePaymentStore } from '@/stores/paymentStore'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { CreditCard } from 'lucide-react-native'

const MODE_COLORS: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  cash:   'success',
  upi:    'info',
  bank:   'info',
  cheque: 'warning',
}

export default function PaymentsScreen() {
  const router   = useRouter()
  const payments = usePaymentStore((s) => s.payments)
  const sorted   = [...payments].sort((a, b) => new Date(b.paymentDate ?? (b as any).date).getTime() - new Date(a.paymentDate ?? (a as any).date).getTime())

  return (
    <View style={styles.root}>
      <TopBar title="Payments" showBack />
      {sorted.length === 0 ? (
        <EmptyState icon={<CreditCard size={28} color={Colors.brand600} />} title="No payments yet" description="Payments received against invoices will appear here" />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: p }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.amount}>₹{formatCurrency(p.amount)}</Text>
                  <Text style={styles.date}>{formatDate(p.paymentDate ?? (p as any).date)}</Text>
                </View>
                <Badge variant={MODE_COLORS[p.method ?? (p as any).mode] ?? 'default'} label={(p.method ?? (p as any).mode)?.toUpperCase() ?? 'CASH'} />
              </View>
              {p.reference && <Text style={styles.ref}>Ref: {p.reference}</Text>}
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#ffffff', borderRadius: Radius.xl,
    padding: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  row:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 16, fontWeight: '700', color: Colors.text, fontVariant: ['tabular-nums'] },
  date:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  ref:    { fontSize: 12, color: Colors.textMuted, marginTop: 8, fontVariant: ['tabular-nums'] },
})
