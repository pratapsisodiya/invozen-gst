import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native'
import { useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { FileText } from 'lucide-react-native'
import type { InvoiceStatus } from '@/lib/types/invoice'

const FILTERS: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'All',     value: 'all' },
  { label: 'Draft',   value: 'draft' },
  { label: 'Sent',    value: 'sent' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Paid',    value: 'paid' },
]

export default function InvoicesScreen() {
  const router   = useRouter()
  const invoices = useInvoiceStore((s) => s.invoices)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (filter !== 'all' && inv.status !== filter) return false
        if (search) {
          const q    = search.toLowerCase()
          const name = ((inv as any).customerSnapshot?.name ?? (inv as any).customerName ?? '').toLowerCase()
          return inv.invoiceNumber.toLowerCase().includes(q) || name.includes(q)
        }
        return true
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [invoices, filter, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: invoices.length }
    invoices.forEach((inv) => { c[inv.status] = (c[inv.status] ?? 0) + 1 })
    return c
  }, [invoices])

  return (
    <View style={styles.root}>
      <TopBar
        title="Invoices"
        right={
          <Button variant="primary" size="sm" onPress={() => router.push('/invoices/new' as any)}>
            New
          </Button>
        }
      />

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.tab, filter === f.value && styles.tabActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.tabText, filter === f.value && styles.tabTextActive]}>
              {f.label}
            </Text>
            {counts[f.value] ? (
              <View style={[styles.count, filter === f.value && styles.countActive]}>
                <Text style={[styles.countText, filter === f.value && styles.countTextActive]}>
                  {counts[f.value]}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search invoices..." />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} color={Colors.brand600} />}
          title="No invoices found"
          description={search ? 'Try a different search' : 'Create your first invoice'}
          actionLabel="New Invoice"
          onAction={() => router.push('/invoices/new' as any)}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: inv }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/invoices/${inv.id}` as any)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.invoiceNum}>{inv.invoiceNumber}</Text>
                <StatusBadge status={inv.status} />
              </View>
              <View style={styles.cardMid}>
                <Text style={styles.custName}>{(inv as any).customerSnapshot?.name ?? (inv as any).customerName ?? ''}</Text>
                <Text style={styles.amount}>₹{formatCurrency(inv.grandTotal)}</Text>
              </View>
              <View style={styles.cardBot}>
                <Text style={styles.date}>{formatDate(inv.invoiceDate)}</Text>
                {inv.balanceDue > 0 && (
                  <Text style={styles.due}>Due: ₹{formatCurrency(inv.balanceDue)}</Text>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },

  tabsScroll:   { flexGrow: 0, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabsContent:  { paddingHorizontal: 16, paddingVertical: 0 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: Colors.brand600 },
  tabText:       { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.brand700 ?? Colors.brand600, fontWeight: '600' },
  count: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 99, backgroundColor: Colors.ink100 ?? Colors.surface,
  },
  countActive:     { backgroundColor: Colors.brand100 ?? Colors.bgTinted },
  countText:       { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  countTextActive: { color: Colors.brand700 ?? Colors.brand600 },

  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },

  list: { padding: 16, paddingTop: 8, gap: 10 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  cardPressed: { backgroundColor: Colors.ink50 },
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardMid:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardBot:  { flexDirection: 'row', justifyContent: 'space-between' },
  invoiceNum: { fontSize: 13, fontWeight: '600', color: Colors.brand600, fontVariant: ['tabular-nums'] },
  custName:   { fontSize: 14, fontWeight: '500', color: Colors.text },
  amount:     { fontSize: 15, fontWeight: '700', color: Colors.text, fontVariant: ['tabular-nums'] },
  date: { fontSize: 12, color: Colors.textMuted },
  due:  { fontSize: 12, color: Colors.warn600, fontWeight: '500' },
})
