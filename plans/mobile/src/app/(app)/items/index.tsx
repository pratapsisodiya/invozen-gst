import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native'
import { useState, useMemo } from 'react'
import { useRouter } from 'expo-router'
import { useItemStore } from '@/stores/itemStore'
import { formatCurrency } from '@/lib/utils/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { Package, Briefcase } from 'lucide-react-native'

const TYPE_FILTERS = ['All', 'Products', 'Services'] as const
const GST_FILTERS  = ['All', '0%', '5%', '12%', '18%', '28%'] as const

export default function ItemsScreen() {
  const router = useRouter()
  const items  = useItemStore((s) => s.items)
  const [search, setSearch]   = useState('')
  const [typeF, setTypeF]     = useState<typeof TYPE_FILTERS[number]>('All')
  const [gstF, setGstF]       = useState<typeof GST_FILTERS[number]>('All')

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const it = item as any
      if (typeF !== 'All' && it.itemType !== typeF.slice(0, -1).toLowerCase()) return false
      if (gstF !== 'All' && String(it.gstRate ?? 0) + '%' !== gstF) return false
      if (search) {
        const q = search.toLowerCase()
        return item.name.toLowerCase().includes(q) || (it.hsnSac ?? '').includes(q)
      }
      return true
    })
  }, [items, typeF, gstF, search])

  return (
    <View style={styles.root}>
      <TopBar
        title="Items"
        right={<Button variant="primary" size="sm" onPress={() => router.push('/items/new' as any)}>Add</Button>}
      />
      <View style={styles.filterArea}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search items..." />
        <View style={styles.filterRow}>
          {TYPE_FILTERS.map((f) => (
            <Pressable key={f} style={[styles.chip, typeF === f && styles.chipActive]} onPress={() => setTypeF(f)}>
              <Text style={[styles.chipText, typeF === f && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.filterRow}>
          {GST_FILTERS.map((f) => (
            <Pressable key={f} style={[styles.chip, gstF === f && styles.chipActive]} onPress={() => setGstF(f)}>
              <Text style={[styles.chipText, gstF === f && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={28} color={Colors.brand600} />}
          title="No items found"
          description="Add products or services to use in invoices"
          actionLabel="Add Item"
          onAction={() => router.push('/items/new' as any)}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const it = item as any
            const Icon = it.itemType === 'service' ? Briefcase : Package
            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/items/${item.id}-edit` as any)}
              >
                <View style={styles.iconBox}>
                  <Icon size={18} color={Colors.brand600} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.hsnSac}>{it.hsnSac ?? '—'} · {item.unit ?? 'pcs'}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.price}>₹{formatCurrency(it.rate ?? it.sellingPrice ?? 0)}</Text>
                  <Badge variant="default" label={`GST ${it.gstRate ?? 0}%`} />
                </View>
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.bgWarm },
  filterArea: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: Colors.border, padding: 16, gap: 10 },
  filterRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:       { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.brand600, borderColor: Colors.brand600 },
  chipText:       { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  chipTextActive: { color: '#fff' },

  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff', borderRadius: Radius.xl,
    padding: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  cardPressed: { backgroundColor: Colors.ink50 },
  iconBox: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.bgTinted, alignItems: 'center', justifyContent: 'center',
  },
  info:     { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  hsnSac:   { fontSize: 12, color: Colors.textMuted, marginTop: 2, fontVariant: ['tabular-nums'] },
  right:    { alignItems: 'flex-end', gap: 4 },
  price:    { fontSize: 14, fontWeight: '700', color: Colors.text, fontVariant: ['tabular-nums'] },
})
