import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useCustomerStore } from '@/stores/customerStore'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { GSTINInput } from '@/components/ui/GSTINInput'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { STATE_CODES } from '@/lib/gst/constants'

const STATE_OPTIONS = Object.values(STATE_CODES).map((name) => ({ label: name, value: name }))
const TYPE_OPTIONS  = [
  { label: 'B2B (Business)',  value: 'b2b' },
  { label: 'B2C (Consumer)', value: 'b2c' },
]

export default function NewCustomerScreen() {
  const router      = useRouter()
  const addCustomer = useCustomerStore((s) => s.addCustomer)

  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [email, setEmail]     = useState('')
  const [gstin, setGstin]     = useState('')
  const [type, setType]       = useState('b2b')
  const [address, setAddress] = useState('')
  const [city, setCity]       = useState('')
  const [pin, setPin]         = useState('')
  const [state, setState]     = useState('')
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim())  e.name = 'Name is required'
    if (!phone.trim()) e.phone = 'Phone is required'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    addCustomer({
      id:           Math.random().toString(36).slice(2),
      name:         name.trim(),
      phone:        phone.trim(),
      email:        email.trim() || null,
      gstin:        gstin.trim() || null,
      customerType: type === 'b2b' ? 'business' : 'individual',
      address:      address.trim() || '',
      city:         city.trim() || '',
      pincode:      pin.trim() || '',
      state:        state || '',
      stateCode:    '',
      createdAt:    new Date().toISOString(),
    } as any)
    setLoading(false)
    router.back()
  }

  return (
    <View style={styles.root}>
      <TopBar title="New Customer" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basic Details</Text>
          <Input label="Customer Name" value={name} onChangeText={setName} placeholder="Business or person name" required error={errors.name} />
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 XXXXX XXXXX" required error={errors.phone} />
          <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="email@example.com" />
          <Select label="Customer Type" value={type} options={TYPE_OPTIONS} onValueChange={setType} />
          {type === 'b2b' && (
            <GSTINInput value={gstin} onChange={setGstin} onValidated={(r) => { if (r.state) setState(r.state) }} />
          )}
        </View>

        <View style={[styles.card, styles.mt12]}>
          <Text style={styles.cardTitle}>Address</Text>
          <Input label="Street Address" value={address} onChangeText={setAddress} placeholder="Building, Street" />
          <View style={styles.row}>
            <Input label="City" value={city} onChangeText={setCity} containerStyle={styles.half} />
            <Input label="PIN Code" value={pin} onChangeText={setPin} keyboardType="numeric" maxLength={6} containerStyle={styles.half} />
          </View>
          <Select label="State" value={state} options={STATE_OPTIONS} onValueChange={setState} />
        </View>

        <View style={styles.actions}>
          <Button variant="outline" size="lg" onPress={() => router.back()} style={styles.actionBtn}>Cancel</Button>
          <Button variant="primary" size="lg" onPress={handleSave} loading={loading} style={styles.actionBtn}>Save Customer</Button>
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
  mt12:      { marginTop: 12 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  row:       { flexDirection: 'row', gap: 12 },
  half:      { flex: 1 },
  actions:   { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1 },
})
