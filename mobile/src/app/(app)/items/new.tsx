import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useItemStore } from '@/stores/itemStore'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Colors, Radius, Shadow } from '@/constants/theme'

const TYPE_OPTIONS    = [{ label: 'Product', value: 'product' }, { label: 'Service', value: 'service' }]
const GST_RATE_OPTIONS = [
  { label: '0%',  value: '0' }, { label: '5%',  value: '5' },
  { label: '12%', value: '12' }, { label: '18%', value: '18' }, { label: '28%', value: '28' },
]
const UNIT_OPTIONS = [
  { label: 'Pieces (pcs)', value: 'pcs' }, { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Litres (ltr)', value: 'ltr' }, { label: 'Hours (hrs)', value: 'hrs' },
  { label: 'Months', value: 'months' }, { label: 'Units', value: 'units' },
]

export default function NewItemScreen() {
  const router  = useRouter()
  const addItem = useItemStore((s) => s.addItem)

  const [name, setName]           = useState('')
  const [type, setType]           = useState('product')
  const [hsnSac, setHsnSac]       = useState('')
  const [sellingPrice, setPrice]  = useState('')
  const [gstRate, setGstRate]     = useState('18')
  const [unit, setUnit]           = useState('pcs')
  const [description, setDesc]    = useState('')
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [loading, setLoading]     = useState(false)

  const handleSave = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!sellingPrice || isNaN(Number(sellingPrice))) e.price = 'Enter a valid price'
    if (Object.keys(e).length) { setErrors(e); return }

    setLoading(true)
    addItem({
      id:          Math.random().toString(36).slice(2),
      name:        name.trim(),
      itemType:    type as 'product' | 'service',
      hsnSac:      hsnSac.trim() || null,
      rate:        Number(sellingPrice),
      gstRate:     Number(gstRate),
      unit,
      description: description.trim() || null,
      createdAt:   new Date().toISOString(),
    } as any)
    setLoading(false)
    router.back()
  }

  return (
    <View style={styles.root}>
      <TopBar title="New Item" showBack />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Item Details</Text>
          <Input label="Item Name" value={name} onChangeText={setName} placeholder="Product or service name" required error={errors.name} />
          <Select label="Type" value={type} options={TYPE_OPTIONS} onValueChange={setType} />
          <Input
            label={type === 'service' ? 'SAC Code' : 'HSN Code'}
            value={hsnSac}
            onChangeText={setHsnSac}
            placeholder={type === 'service' ? 'e.g. 998314' : 'e.g. 8471'}
            keyboardType="numeric"
          />
          <View style={styles.row}>
            <Input
              label="Selling Price (₹)"
              value={sellingPrice}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="0.00"
              required
              error={errors.price}
              containerStyle={styles.half}
            />
            <Select label="Unit" value={unit} options={UNIT_OPTIONS} onValueChange={setUnit} containerStyle={styles.half} />
          </View>
          <Select label="GST Rate" value={gstRate} options={GST_RATE_OPTIONS} onValueChange={setGstRate} />
          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDesc}
            placeholder="Brief description..."
            multiline
            style={{ minHeight: 64 }}
          />
        </View>

        <View style={styles.actions}>
          <Button variant="outline" size="lg" onPress={() => router.back()} style={styles.actionBtn}>Cancel</Button>
          <Button variant="primary" size="lg" onPress={handleSave} loading={loading} style={styles.actionBtn}>Save Item</Button>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#ffffff', borderRadius: Radius.xl,
    padding: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  row:       { flexDirection: 'row', gap: 12 },
  half:      { flex: 1 },
  actions:   { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1 },
})
