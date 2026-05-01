import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native'
import { useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Colors, FontFamily, Radius, Shadow } from '@/constants/theme'
import { FileText, ChevronRight } from 'lucide-react-native'
import type { InvoiceStatus } from '@/lib/types/invoice'

const FILTERS: { label: string; value: InvoiceStatus | 'all'; color: string }[] = [
  { label: 'All',     value: 'all',     color: Colors.brand600 },
  { label: 'Draft',   value: 'draft',   color: Colors.textMuted },
  { label: 'Sent',    value: 'sent',    color: Colors.blue600 },
  { label: 'Overdue', value: 'overdue', color: Colors.err600 },
  { label: 'Paid',    value: 'paid',    color: Colors.ok600 },
]

function FilterChip({
  label, count, active, color, onPress,
}: { label: string; count: number; active: boolean; color: string; onPress: () => void }) {
  const scale = useSharedValue(1)
  const chipStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={chipStyle}>
      <Pressable
        style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.92, { damping: 12 }) }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12 }) }}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
            <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
              {count}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  )
}

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

  const totalAmount = useMemo(
    () => filtered.reduce((sum, inv) => sum + inv.grandTotal, 0),
    [filtered]
  )

  return (
    <View style={styles.root}>
      <TopBar
        title="Invoices"
        right={
          <Button variant="primary" size="sm" onPress={() => router.push('/invoices/new' as any)}>
            + New
          </Button>
        }
      />

      {/* Filter chips */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              count={counts[f.value] ?? 0}
              active={filter === f.value}
              color={f.color}
              onPress={() => setFilter(f.value)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by invoice # or customer…" />
      </View>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''} · ₹{formatCurrency(totalAmount)}
          </Text>
        </View>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} color={Colors.brand600} />}
          title="No invoices found"
          description={search ? 'Try a different search term' : 'Create your first invoice to get started'}
          actionLabel="Create Invoice"
          onAction={() => router.push('/invoices/new' as any)}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: inv }) => <InvoiceCard inv={inv} onPress={() => router.push(`/invoices/${inv.id}` as any)} />}
        />
      )}
    </View>
  )
}

function InvoiceCard({ inv, onPress }: { inv: any; onPress: () => void }) {
  const scale = useSharedValue(1)
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const customerName = inv.customerSnapshot?.name ?? inv.customerName ?? ''

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 14 }) }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14 }) }}
      >
        <View style={styles.cardLeft}>
          <View style={styles.cardIconWrap}>
            <FileText size={16} color={Colors.brand600} />
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.invoiceNum}>{inv.invoiceNumber}</Text>
            <StatusBadge status={inv.status} />
          </View>
          <Text style={styles.custName} numberOfLines={1}>{customerName}</Text>
          <View style={styles.cardBottomRow}>
            <Text style={styles.date}>{formatDate(inv.invoiceDate)}</Text>
            {inv.balanceDue > 0 && (
              <Text style={styles.due}>Due ₹{formatCurrency(inv.balanceDue)}</Text>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.amount}>₹{formatCurrency(inv.grandTotal)}</Text>
          <ChevronRight size={14} color={Colors.textFaint} />
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },

  filterBar:    { backgroundColor: Colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  chipRow:      { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipText:            { fontSize: 13, fontFamily: FontFamily.medium, color: Colors.textMuted },
  chipTextActive:      { color: '#fff', fontFamily: FontFamily.semibold },
  chipBadge:           { backgroundColor: Colors.ink100, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 },
  chipBadgeActive:     { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipBadgeText:       { fontSize: 11, fontFamily: FontFamily.semibold, color: Colors.textMuted },
  chipBadgeTextActive: { color: '#fff' },

  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: Colors.white },

  summaryBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.bgWarm },
  summaryText: { fontSize: 12, fontFamily: FontFamily.medium, color: Colors.textMuted },

  list: { padding: 16, paddingTop: 8, gap: 8 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    ...Shadow.sm,
  },
  cardPressed: { backgroundColor: Colors.ink50 },
  cardLeft: { justifyContent: 'center' },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardTopRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  invoiceNum: { fontSize: 13, fontFamily: FontFamily.semibold, color: Colors.text },
  custName:   { fontSize: 13, fontFamily: FontFamily.regular, color: Colors.textMuted },
  date:       { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textFaint },
  due:        { fontSize: 11, fontFamily: FontFamily.semibold, color: Colors.warn600 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  amount:    { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.text, fontVariant: ['tabular-nums'] },
})
