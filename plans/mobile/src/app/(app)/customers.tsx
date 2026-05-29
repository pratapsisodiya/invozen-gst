import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native'
import { useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useCustomerStore } from '@/stores/customerStore'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Colors, FontFamily, Radius, Shadow } from '@/constants/theme'
import { Users, ChevronRight, Building2, User } from 'lucide-react-native'

const TYPE_FILTERS = ['All', 'B2B', 'B2C'] as const
type TypeFilter = typeof TYPE_FILTERS[number]

const AVATAR_COLORS = [
  { bg: Colors.brand100, text: Colors.brand700 },
  { bg: Colors.blue50,   text: Colors.blue600 },
  { bg: Colors.ok50,     text: Colors.ok600 },
  { bg: Colors.warn50,   text: Colors.warn600 },
]

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const colorIdx = name.charCodeAt(0) % AVATAR_COLORS.length
  const { bg, text } = AVATAR_COLORS[colorIdx]
  return (
    <View style={[avatarStyles.box, { backgroundColor: bg }]}>
      <Text style={[avatarStyles.text, { color: text }]}>{initials}</Text>
    </View>
  )
}
const avatarStyles = StyleSheet.create({
  box:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, fontFamily: FontFamily.bold },
})

function CustomerCard({ customer, onPress }: { customer: any; onPress: () => void }) {
  const scale = useSharedValue(1)
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const isB2B = customer.customerType === 'business'
  const outstanding = customer.outstandingAmount ?? 0

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 14 }) }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14 }) }}
      >
        <Avatar name={customer.name} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{customer.name}</Text>
            <View style={[styles.typePill, { backgroundColor: isB2B ? Colors.blue50 : Colors.ink100 }]}>
              {isB2B
                ? <Building2 size={10} color={Colors.blue600} />
                : <User size={10} color={Colors.ink500} />
              }
              <Text style={[styles.typeText, { color: isB2B ? Colors.blue600 : Colors.ink500 }]}>
                {isB2B ? 'B2B' : 'B2C'}
              </Text>
            </View>
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {customer.gstin ?? customer.state ?? 'No GSTIN'}
          </Text>
          {outstanding > 0 && (
            <Text style={styles.outstanding}>₹{outstanding.toLocaleString('en-IN')} outstanding</Text>
          )}
        </View>
        <ChevronRight size={16} color={Colors.textFaint} />
      </Pressable>
    </Animated.View>
  )
}

export default function CustomersScreen() {
  const router    = useRouter()
  const customers = useCustomerStore((s) => s.customers)
  const [search, setSearch]   = useState('')
  const [typeFilter, setType] = useState<TypeFilter>('All')

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const ct = (c as any)
      if (typeFilter !== 'All' && ct.customerType !== (typeFilter === 'B2B' ? 'business' : 'individual')) return false
      if (search) {
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || (c.gstin ?? '').toLowerCase().includes(q)
      }
      return true
    })
  }, [customers, typeFilter, search])

  return (
    <View style={styles.root}>
      <TopBar
        title="Customers"
        right={
          <Button variant="primary" size="sm" onPress={() => router.push('/customers/new' as any)}>
            + Add
          </Button>
        }
      />

      <View style={styles.filterArea}>
        <View style={styles.typeRow}>
          {TYPE_FILTERS.map((t) => {
            const active = typeFilter === t
            return (
              <Pressable
                key={t}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t}</Text>
              </Pressable>
            )
          })}
          <Text style={styles.filterCount}>{filtered.length} total</Text>
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Name or GSTIN…" />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} color={Colors.brand600} />}
          title="No customers found"
          description={search ? 'Try a different search' : 'Add your first customer to get started'}
          actionLabel="Add Customer"
          onAction={() => router.push('/customers/new' as any)}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: c }) => (
            <CustomerCard
              customer={c}
              onPress={() => router.push(`/customers/${c.id}` as any)}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },

  filterArea: {
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  typeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  typeChipActive:     { backgroundColor: Colors.brand600, borderColor: Colors.brand600 },
  typeChipText:       { fontSize: 13, fontFamily: FontFamily.medium, color: Colors.textMuted },
  typeChipTextActive: { fontFamily: FontFamily.semibold, color: '#fff' },
  filterCount:        { marginLeft: 'auto', fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textFaint },

  list: { padding: 16, gap: 8 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  cardPressed: { backgroundColor: Colors.ink50 },

  info:    { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name:    { fontSize: 14, fontFamily: FontFamily.semibold, color: Colors.text, flex: 1 },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  typeText:    { fontSize: 10, fontFamily: FontFamily.semibold },
  sub:         { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textMuted },
  outstanding: { fontSize: 11, fontFamily: FontFamily.semibold, color: Colors.warn600, marginTop: 2 },
})
