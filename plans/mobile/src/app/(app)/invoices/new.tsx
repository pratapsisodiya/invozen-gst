import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native'
import { useState, useMemo } from 'react'
import { useRouter } from 'expo-router'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { useCustomerStore } from '@/stores/customerStore'
import { useItemStore } from '@/stores/itemStore'
import { calculateLineItem, calculateInvoiceTotals } from '@/lib/gst/calculator'
import { formatCurrency } from '@/lib/utils/formatters'
import { generateId } from '@/lib/utils/ids'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { Trash2 } from 'lucide-react-native'
import type { LineItem, SupplyType } from '@/lib/types/invoice'

interface FormLine {
  itemId:         string
  description:    string
  hsnSac:         string
  quantity:       number
  unit:           string
  rate:           number
  discountPercent: number
  gstRate:        number
}

const GST_RATES = [
  { label: '0%', value: '0' }, { label: '5%', value: '5' },
  { label: '12%', value: '12' }, { label: '18%', value: '18' }, { label: '28%', value: '28' },
]

const today   = new Date().toISOString().split('T')[0]
const due30   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
const BLANK: FormLine = { itemId: '', description: '', hsnSac: '', quantity: 1, unit: 'pcs', rate: 0, discountPercent: 0, gstRate: 18 }

function buildLineItem(fl: FormLine, supplyType: SupplyType): LineItem {
  const calc = calculateLineItem(fl.quantity, fl.rate, fl.discountPercent, fl.gstRate, supplyType)
  return {
    id:             generateId(),
    itemId:         fl.itemId || null,
    description:    fl.description || 'Item',
    hsnSac:         fl.hsnSac,
    quantity:       fl.quantity,
    unit:           fl.unit,
    rate:           fl.rate,
    discountPercent: fl.discountPercent,
    gstRate:        fl.gstRate,
    ...calc,
  }
} 

export default function NewInvoiceScreen() {
  const router    = useRouter()
  const { addInvoice, invoices } = useInvoiceStore()
  const customers = useCustomerStore((s) => s.customers)
  const items     = useItemStore((s) => s.items)

  const [customerId, setCustomerId]   = useState('')
  const [invoiceDate, setInvoiceDate] = useState(today)
  const [dueDate, setDueDate]         = useState(due30)
  const [formLines, setFormLines]     = useState<FormLine[]>([{ ...BLANK }])
  const [notes, setNotes]             = useState('')
  const [loading, setLoading]         = useState(false)

  const customerOpts = customers.map((c) => ({ label: c.name, value: c.id }))
  const itemOpts     = [{ label: '— Custom item —', value: '' }, ...items.map((i) => ({ label: i.name, value: i.id }))]

  const supplyType: SupplyType = 'intra'

  const preview = useMemo(() => {
    const lineItems = formLines.map((fl) => buildLineItem(fl, supplyType))
    return calculateInvoiceTotals(lineItems, supplyType)
  }, [formLines, supplyType])

  const updateLine = (i: number, patch: Partial<FormLine>) => {
    setFormLines((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], ...patch }
      if (patch.itemId !== undefined && patch.itemId) {
        const it = (items.find((x) => x.id === patch.itemId) as any)
        if (it) next[i] = { ...next[i], description: it.name, hsnSac: it.hsnSac ?? '', rate: it.rate ?? it.sellingPrice ?? 0, gstRate: it.gstRate ?? 18, unit: it.unit ?? 'pcs' }
      }
      return next
    })
  }

  const removeLine = (i: number) => setFormLines((p) => p.filter((_, j) => j !== i))
  const addLine    = () => setFormLines((p) => [...p, { ...BLANK }])

  const handleSave = () => {
    if (!customerId) { Alert.alert('Error', 'Please select a customer'); return }
    setLoading(true)
    const customer = customers.find((c) => c.id === customerId)!
    const lineItems = formLines.map((fl) => buildLineItem(fl, supplyType))
    const totals    = calculateInvoiceTotals(lineItems, supplyType)
    const invNum    = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`

    addInvoice({
      id:            generateId(),
      invoiceNumber: invNum,
      invoiceType:   'tax_invoice',
      status:        'draft',
      customerId,
      customerSnapshot: {
        name:      customer.name,
        gstin:     (customer as any).gstin ?? null,
        address:   (customer as any).address ?? '',
        state:     (customer as any).state ?? '',
        stateCode: (customer as any).stateCode ?? '',
      },
      supplyType,
      invoiceDate,
      dueDate,
      lineItems,
      ...totals,
      amountPaid: 0,
      balanceDue: totals.grandTotal,
      notes:        notes || null,
      terms:        null,
      placeOfSupply: '',
      irnNumber:    null,
      irnStatus:    null,
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    } as any)
    setLoading(false)
    router.back()
  }

  return (
    <View style={styles.root}>
      <TopBar title="New Invoice" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invoice Details</Text>
          <Select label="Customer" value={customerId} options={customerOpts} onValueChange={setCustomerId} placeholder="Select customer..." required />
          <View style={styles.row}>
            <Input label="Invoice Date" value={invoiceDate} onChangeText={setInvoiceDate} containerStyle={styles.half} />
            <Input label="Due Date"     value={dueDate}     onChangeText={setDueDate}     containerStyle={styles.half} />
          </View>
        </View>

        <View style={[styles.card, styles.mt12]}>
          <Text style={styles.cardTitle}>Items</Text>
          {formLines.map((line, i) => (
            <View key={i} style={[styles.lineItem, i > 0 && styles.lineItemBorder]}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineNum}>Item {i + 1}</Text>
                {formLines.length > 1 && (
                  <Pressable onPress={() => removeLine(i)} hitSlop={8}>
                    <Trash2 size={14} color={Colors.err600} />
                  </Pressable>
                )}
              </View>
              <Select label="Select item" value={line.itemId} options={itemOpts} onValueChange={(v) => updateLine(i, { itemId: v })} />
              <Input label="Description" value={line.description} onChangeText={(v) => updateLine(i, { description: v })} placeholder="Item description" />
              <View style={styles.row}>
                <Input label="Qty"     value={String(line.quantity)}       onChangeText={(v) => updateLine(i, { quantity: Number(v) || 1 })}    keyboardType="numeric" containerStyle={styles.third} />
                <Input label="Rate (₹)" value={String(line.rate)}          onChangeText={(v) => updateLine(i, { rate: Number(v) || 0 })}         keyboardType="numeric" containerStyle={styles.third} />
                <Select label="GST"    value={String(line.gstRate)}         onValueChange={(v) => updateLine(i, { gstRate: Number(v) })}          options={GST_RATES}    containerStyle={styles.third} />
              </View>
              <Text style={styles.lineTotal}>
                Line: ₹{formatCurrency(calculateLineItem(line.quantity, line.rate, line.discountPercent, line.gstRate, supplyType).totalAmount)}
              </Text>
            </View>
          ))}
          <Button variant="outline" size="sm" onPress={addLine} style={styles.addLine}>+ Add Item</Button>
        </View>

        <View style={[styles.card, styles.mt12]}>
          <Text style={styles.cardTitle}>Totals</Text>
          <SumRow label="Subtotal"    value={preview.subtotal} />
          {preview.cgstTotal > 0 && <SumRow label="CGST"     value={preview.cgstTotal} />}
          {preview.sgstTotal > 0 && <SumRow label="SGST"     value={preview.sgstTotal} />}
          {preview.igstTotal > 0 && <SumRow label="IGST"     value={preview.igstTotal} />}
          <SumRow label="Total Tax"   value={preview.totalTax} />
          <SumRow label="Grand Total" value={preview.grandTotal} bold />
        </View>

        <View style={[styles.card, styles.mt12]}>
          <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Payment terms, thank you..." multiline style={{ minHeight: 64 }} />
        </View>

        <View style={styles.actions}>
          <Button variant="outline" size="lg" onPress={() => router.back()} style={styles.actionBtn}>Cancel</Button>
          <Button variant="primary" size="lg" onPress={handleSave} loading={loading} style={styles.actionBtn}>Save Draft</Button>
        </View>
      </ScrollView>
    </View>
  )
}

function SumRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={sumS.row}>
      <Text style={[sumS.label, bold && sumS.bold]}>{label}</Text>
      <Text style={[sumS.value, bold && sumS.bold]}>₹{formatCurrency(value)}</Text>
    </View>
  )
}
const sumS = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  label: { fontSize: 14, color: Colors.text2 },
  value: { fontSize: 14, color: Colors.text, fontVariant: ['tabular-nums'] },
  bold:  { fontWeight: '700', fontSize: 15, color: Colors.brand600 },
})

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#ffffff', borderRadius: Radius.xl, padding: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  mt12:      { marginTop: 12 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  row:   { flexDirection: 'row', gap: 12 },
  half:  { flex: 1 },
  third: { flex: 1 },
  lineItem:       { paddingVertical: 12 },
  lineItemBorder: { borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  lineHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  lineNum:        { fontSize: 13, fontWeight: '600', color: Colors.text2 },
  lineTotal:      { fontSize: 13, color: Colors.brand600, fontWeight: '600', textAlign: 'right', marginTop: -8, marginBottom: 4 },
  addLine:        { marginTop: 8 },
  actions:        { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn:      { flex: 1 },
})
