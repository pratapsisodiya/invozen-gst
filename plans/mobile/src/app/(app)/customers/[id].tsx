import { View, Text, StyleSheet, ScrollView, FlatList, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCustomerStore } from '@/stores/customerStore'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { Phone, Mail, MapPin } from 'lucide-react-native'

export default function CustomerDetailScreen() {
  const { id }     = useLocalSearchParams<{ id: string }>()
  const router     = useRouter()
  const customers  = useCustomerStore((s) => s.customers)
  const invoices   = useInvoiceStore((s) => s.invoices)
  const customer   = customers.find((c) => c.id === id)

  if (!customer) {
    return (
      <View style={styles.root}>
        <TopBar title="Customer" showBack />
        <View style={styles.notFound}><Text style={styles.notFoundText}>Customer not found</Text></View>
      </View>
    )
  }

  const custInvoices = invoices
    .filter((i) => i.customerId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const initials = customer.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <View style={styles.root}>
      <TopBar
        title={customer.name}
        showBack
        right={
          <Button variant="ghost" size="sm" onPress={() => router.push(`/customers/${id}-edit` as any)}>
            Edit
          </Button>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
            <View style={styles.profileInfo}>
              <Text style={styles.custName}>{customer.name}</Text>
              <Badge variant={(customer as any).customerType === 'business' ? 'info' : 'neutral'} label={(customer as any).customerType === 'business' ? 'B2B' : 'B2C'} />
            </View>
          </View>
          {customer.gstin && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>GSTIN</Text>
              <Text style={styles.infoVal}>{customer.gstin}</Text>
            </View>
          )}
          {(customer as any).state && (
            <View style={styles.infoRow}>
              <MapPin size={13} color={Colors.textMuted} />
              <Text style={styles.infoVal}>{(customer as any).state}</Text>
            </View>
          )}
          {customer.phone && (
            <View style={styles.infoRow}>
              <Phone size={13} color={Colors.textMuted} />
              <Text style={styles.infoVal}>{customer.phone}</Text>
            </View>
          )}
          {customer.email && (
            <View style={styles.infoRow}>
              <Mail size={13} color={Colors.textMuted} />
              <Text style={styles.infoVal}>{customer.email}</Text>
            </View>
          )}
          {((customer as any).outstandingAmount ?? 0) > 0 && (
            <View style={styles.outstandingBanner}>
              <Text style={styles.outstandingText}>
                Outstanding: ₹{formatCurrency((customer as any).outstandingAmount ?? 0)}
              </Text>
            </View>
          )}
        </View>

        {/* Invoices */}
        <Text style={styles.sectionTitle}>Invoices ({custInvoices.length})</Text>
        <View style={styles.card}>
          {custInvoices.length === 0 ? (
            <Text style={styles.empty}>No invoices yet</Text>
          ) : (
            custInvoices.map((inv, i) => (
              <Pressable
                key={inv.id}
                style={({ pressed }) => [styles.invRow, i > 0 && styles.invRowBorder, pressed && styles.invRowPressed]}
                onPress={() => router.push(`/invoices/${inv.id}` as any)}
              >
                <View>
                  <Text style={styles.invNum}>{inv.invoiceNumber}</Text>
                  <Text style={styles.invDate}>{formatDate(inv.invoiceDate)}</Text>
                </View>
                <View style={styles.invRight}>
                  <Text style={styles.invAmt}>₹{formatCurrency(inv.grandTotal)}</Text>
                  <StatusBadge status={inv.status} />
                </View>
              </Pressable>
            ))
          )}
        </View>

        <Button
          variant="primary"
          size="lg"
          onPress={() => router.push('/invoices/new' as any)}
          style={styles.newBtn}
        >
          {`+ New Invoice for ${customer.name.split(' ')[0]}`}
        </Button>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { padding: 16, paddingBottom: 32 },
  notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: Colors.textMuted },

  card: {
    backgroundColor: '#ffffff', borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm, overflow: 'hidden',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft },
  avatar:      { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.brand100 ?? Colors.bgTinted, alignItems: 'center', justifyContent: 'center' },
  initials:    { fontSize: 18, fontWeight: '700', color: Colors.brand700 ?? Colors.brand600 },
  profileInfo: { flex: 1, gap: 6 },
  custName:    { fontSize: 16, fontWeight: '700', color: Colors.text },

  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  infoLabel: { fontSize: 12, color: Colors.textMuted, width: 50 },
  infoVal:   { fontSize: 13, color: Colors.text, flex: 1, fontVariant: ['tabular-nums'] },

  outstandingBanner: { margin: 12, padding: 10, backgroundColor: Colors.warn50 ?? '#fffbeb', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.warn600 + '40' },
  outstandingText:   { fontSize: 13, fontWeight: '600', color: Colors.warn600 },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 20, marginBottom: 12 },

  invRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  invRowBorder:  { borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  invRowPressed: { backgroundColor: Colors.ink50 },
  invNum:   { fontSize: 13, fontWeight: '600', color: Colors.brand600, fontVariant: ['tabular-nums'] },
  invDate:  { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  invRight: { alignItems: 'flex-end', gap: 4 },
  invAmt:   { fontSize: 14, fontWeight: '600', color: Colors.text, fontVariant: ['tabular-nums'] },
  empty:    { padding: 24, textAlign: 'center', color: Colors.textMuted },

  newBtn: { marginTop: 16 },
})
