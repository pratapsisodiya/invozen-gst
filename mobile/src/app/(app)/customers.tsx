import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native'
import { useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import { useCustomerStore } from '@/stores/customerStore'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { Users } from 'lucide-react-native'

const TYPE_FILTERS = ['All', 'B2B', 'B2C'] as const
type TypeFilter = typeof TYPE_FILTERS[number]

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <View style={avatarStyles.box}>
      <Text style={avatarStyles.text}>{initials}</Text>
    </View>
  )
}
const avatarStyles = StyleSheet.create({
  box:  { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.brand100 ?? Colors.bgTinted, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, fontWeight: '700', color: Colors.brand700 ?? Colors.brand600 },
})

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
            Add
          </Button>
        }
      />

      <View style={styles.filters}>
        <View style={styles.typeRow}>
          {TYPE_FILTERS.map((t) => (
            <Pressable
              key={t}
              style={[styles.typeBtn, typeFilter === t && styles.typeBtnActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeBtnText, typeFilter === t && styles.typeBtnTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search customers..." />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} color={Colors.brand600} />}
          title="No customers found"
          description={search ? 'Try a different search' : 'Add your first customer'}
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
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/customers/${c.id}` as any)}
            >
              <Avatar name={c.name} />
              <View style={styles.info}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.sub}>{c.gstin ?? (c as any).state ?? 'No GSTIN'}</Text>
              </View>
              <View style={styles.right}>
                <Badge variant={(c as any).customerType === 'business' ? 'info' : 'neutral'} label={(c as any).customerType === 'business' ? 'B2B' : 'B2C'} />
                {((c as any).outstandingAmount ?? 0) > 0 && (
                  <Text style={styles.outstanding}>₹{(c as any).outstandingAmount?.toLocaleString('en-IN')}</Text>
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

  filters:  { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: Colors.border, padding: 16, paddingBottom: 12, gap: 12 },
  typeRow:  { flexDirection: 'row', gap: 8 },
  typeBtn:  { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff' },
  typeBtnActive: { backgroundColor: Colors.brand600, borderColor: Colors.brand600 },
  typeBtnText:   { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  typeBtnTextActive: { color: '#fff' },

  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm,
  },
  cardPressed: { backgroundColor: Colors.ink50 },
  info:  { flex: 1 },
  name:  { fontSize: 14, fontWeight: '600', color: Colors.text },
  sub:   { fontSize: 12, color: Colors.textMuted, marginTop: 2, fontVariant: ['tabular-nums'] },
  right: { alignItems: 'flex-end', gap: 4 },
  outstanding: { fontSize: 12, color: Colors.warn600, fontWeight: '500' },
})
