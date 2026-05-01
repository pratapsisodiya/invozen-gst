import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { Share2, MessageSquare, Edit as EditIcon, Trash2 } from 'lucide-react-native'
import { useState } from 'react'

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router  = useRouter()
  const { invoices, deleteInvoice } = useInvoiceStore()
  const invoice = invoices.find((i) => i.id === id)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!invoice) {
    return (
      <View style={styles.root}>
        <TopBar title="Invoice" showBack />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Invoice not found</Text>
        </View>
      </View>
    )
  }

  const handleDelete = () => {
    deleteInvoice(invoice.id)
    router.back()
  }

  return (
    <View style={styles.root}>
      <TopBar
        title={invoice.invoiceNumber}
        showBack
        right={
          <Pressable onPress={() => setDeleteOpen(true)} hitSlop={8}>
            <Trash2 size={18} color={Colors.err600} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.invoiceNum}>{invoice.invoiceNumber}</Text>
            <StatusBadge status={invoice.status} />
          </View>
          <Text style={styles.grandTotal}>₹{formatCurrency(invoice.grandTotal)}</Text>
          <View style={styles.datesRow}>
            <View>
              <Text style={styles.dateLabel}>Invoice Date</Text>
              <Text style={styles.dateVal}>{formatDate(invoice.invoiceDate)}</Text>
            </View>
            {invoice.dueDate && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.dateLabel}>Due Date</Text>
                <Text style={[styles.dateVal, invoice.status === 'overdue' && { color: Colors.err600 }]}>
                  {formatDate(invoice.dueDate)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bill To */}
        <View style={[styles.card, styles.mt12]}>
          <Text style={styles.cardTitle}>Bill To</Text>
          <Text style={styles.custName}>{(invoice as any).customerSnapshot?.name ?? (invoice as any).customerName}</Text>
          {((invoice as any).customerSnapshot?.gstin ?? (invoice as any).customerGstin) && (
            <Text style={styles.gstin}>{(invoice as any).customerSnapshot?.gstin ?? (invoice as any).customerGstin}</Text>
          )}
          {((invoice as any).customerSnapshot?.state ?? (invoice as any).customerState) && (
            <Text style={styles.sub}>{(invoice as any).customerSnapshot?.state ?? (invoice as any).customerState}</Text>
          )}
        </View>

        {/* Line Items */}
        <View style={[styles.card, styles.mt12]}>
          <Text style={styles.cardTitle}>Items</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 3 }]}>Item</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Qty</Text>
            <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Total</Text>
          </View>
          {((invoice as any).lineItems ?? (invoice as any).items ?? []).map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <View style={{ flex: 3 }}>
                <Text style={styles.itemName}>{item.description ?? item.name}</Text>
                {item.hsnSac && <Text style={styles.hsn}>{item.hsnSac}</Text>}
              </View>
              <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{item.quantity}</Text>
              <Text style={[styles.td, { flex: 2, textAlign: 'right' }]}>₹{formatCurrency(item.rate)}</Text>
              <Text style={[styles.td, { flex: 2, textAlign: 'right' }]}>₹{formatCurrency(item.totalAmount ?? item.amount ?? 0)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={[styles.card, styles.mt12]}>
          <Text style={styles.cardTitle}>Summary</Text>
          <TotalRow label="Subtotal"    value={(invoice as any).subtotal ?? 0} />
          {((invoice as any).cgstTotal ?? (invoice as any).totalCgst ?? 0) > 0 && <TotalRow label="CGST" value={(invoice as any).cgstTotal ?? (invoice as any).totalCgst ?? 0} />}
          {((invoice as any).sgstTotal ?? (invoice as any).totalSgst ?? 0) > 0 && <TotalRow label="SGST" value={(invoice as any).sgstTotal ?? (invoice as any).totalSgst ?? 0} />}
          {((invoice as any).igstTotal ?? (invoice as any).totalIgst ?? 0) > 0 && <TotalRow label="IGST" value={(invoice as any).igstTotal ?? (invoice as any).totalIgst ?? 0} />}
          <TotalRow label="Total Tax"   value={invoice.totalTax} />
          <TotalRow label="Grand Total" value={invoice.grandTotal} bold accent />
          {invoice.balanceDue > 0 && (
            <TotalRow label="Balance Due" value={invoice.balanceDue} warn />
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Button
            variant="outline"
            size="md"
            style={styles.actionBtn}
            leftIcon={<Share2 size={14} color={Colors.brand600} />}
            onPress={() => {}}
          >
            Share PDF
          </Button>
          <Button
            variant="secondary"
            size="md"
            style={styles.actionBtn}
            leftIcon={<MessageSquare size={14} color={Colors.brand700 ?? Colors.brand600} />}
            onPress={() => {}}
          >
            WhatsApp
          </Button>
          <Button
            variant="ghost"
            size="md"
            style={styles.actionBtn}
            leftIcon={<EditIcon size={14} color={Colors.brand600} />}
            onPress={() => router.push(`/invoices/${invoice.id}-edit` as any)}
          >
            Edit
          </Button>
        </View>
      </ScrollView>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Delete ${invoice.invoiceNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </View>
  )
}

function TotalRow({ label, value, bold, accent, warn }: {
  label: string; value: number; bold?: boolean; accent?: boolean; warn?: boolean
}) {
  return (
    <View style={totalStyles.row}>
      <Text style={[totalStyles.label, bold && totalStyles.bold]}>{label}</Text>
      <Text style={[
        totalStyles.value,
        bold   && totalStyles.bold,
        accent && { color: Colors.brand700 ?? Colors.brand600 },
        warn   && { color: Colors.warn600 },
      ]}>
        ₹{formatCurrency(value)}
      </Text>
    </View>
  )
}
const totalStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  label: { fontSize: 14, color: Colors.text2 },
  value: { fontSize: 14, color: Colors.text, fontVariant: ['tabular-nums'] },
  bold:  { fontWeight: '700', fontSize: 15 },
})

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { padding: 16, paddingBottom: 32 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: Colors.textMuted },

  card: {
    backgroundColor: '#ffffff', borderRadius: Radius.xl,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm,
  },
  mt12: { marginTop: 12 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceNum: { fontSize: 15, fontWeight: '600', color: Colors.brand600, fontVariant: ['tabular-nums'] },
  grandTotal: { fontSize: 28, fontWeight: '800', color: Colors.brand700 ?? Colors.brand600, fontVariant: ['tabular-nums'], marginBottom: 12 },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  dateVal:   { fontSize: 14, fontWeight: '500', color: Colors.text },

  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  custName:  { fontSize: 15, fontWeight: '600', color: Colors.text },
  gstin:     { fontSize: 13, color: Colors.textMuted, marginTop: 4, fontVariant: ['tabular-nums'] },
  sub:       { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  tableHeader: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 4 },
  tableRow:    { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  th:         { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  td:         { fontSize: 13, color: Colors.text, fontVariant: ['tabular-nums'] },
  itemName:   { fontSize: 13, fontWeight: '500', color: Colors.text },
  hsn:        { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 20, flexWrap: 'wrap' },
  actionBtn:  { flex: 1, minWidth: 100 },
})
