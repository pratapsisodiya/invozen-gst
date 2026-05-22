import {
  View, Text, StyleSheet, ScrollView, Pressable, Share, Linking, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Share2, MessageSquare, Edit as EditIcon, Trash2, CheckCircle, CreditCard,
} from 'lucide-react-native'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { usePaymentStore } from '@/stores/paymentStore'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { generateId } from '@/lib/utils/ids'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Colors, Radius, Shadow } from '@/constants/theme'
import type { PaymentMethod } from '@/lib/types/payment'
import { PAYMENT_METHOD_LABELS } from '@/lib/types/payment'

const PAYMENT_METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
  (k) => ({ label: PAYMENT_METHOD_LABELS[k], value: k })
)

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { invoices, deleteInvoice, markAsSent, markAsPaid } = useInvoiceStore()
  const { addPayment, getPaymentsByInvoice } = usePaymentStore()
  const invoice = invoices.find((i) => i.id === id)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payMethod, setPayMethod] = useState<PaymentMethod>('upi')
  const [payRef, setPayRef] = useState('')

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

  const payments = getPaymentsByInvoice(invoice.id)

  const handleDelete = () => {
    deleteInvoice(invoice.id)
    router.back()
  }

  const handleShare = async () => {
    const customerName = (invoice as any).customerSnapshot?.name ?? 'Customer'
    await Share.share({
      message: `Invoice ${invoice.invoiceNumber}\nCustomer: ${customerName}\nAmount: ₹${formatCurrency(invoice.grandTotal)}\nDue: ${formatDate(invoice.dueDate ?? '')}\n\nThank you for your business!`,
      title: `Invoice ${invoice.invoiceNumber}`,
    })
  }

  const handleWhatsApp = () => {
    const phone = (invoice as any).customerSnapshot?.phone ?? ''
    if (!phone) {
      Alert.alert('No Phone Number', 'This customer has no phone number on record.')
      return
    }
    const cleaned = phone.replace(/\D/g, '')
    const customerName = (invoice as any).customerSnapshot?.name ?? 'Customer'
    const msg = encodeURIComponent(
      `Hi ${customerName}, your invoice ${invoice.invoiceNumber} for ₹${formatCurrency(invoice.grandTotal)} is due on ${formatDate(invoice.dueDate ?? '')}. Please arrange payment. Thank you.`
    )
    Linking.openURL(`whatsapp://send?phone=91${cleaned}&text=${msg}`).catch(() =>
      Alert.alert('WhatsApp not installed', 'Please install WhatsApp to use this feature.')
    )
  }

  const handleRecordPayment = () => {
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.')
      return
    }
    const payment = {
      id: generateId(),
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      amount,
      paymentDate: payDate,
      method: payMethod,
      reference: payRef.trim() || null,
      notes: null,
      createdAt: new Date().toISOString(),
    }
    addPayment(payment)
    markAsPaid(invoice.id, amount)
    setPayOpen(false)
    setPayAmount('')
    setPayRef('')
  }

  const openPayModal = () => {
    setPayAmount(String(invoice.balanceDue ?? invoice.grandTotal))
    setPayDate(new Date().toISOString().split('T')[0])
    setPayMethod('upi')
    setPayRef('')
    setPayOpen(true)
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

        {/* Contextual Actions */}
        <View style={[styles.actionsRow, styles.mt12]}>
          {invoice.status === 'draft' && (
            <Pressable
              style={[styles.actionPill, styles.actionPillPrimary]}
              onPress={() => markAsSent(invoice.id)}
            >
              <CheckCircle size={14} color="#fff" strokeWidth={2} />
              <Text style={styles.actionPillTextPrimary}>Mark as Sent</Text>
            </Pressable>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <>
              <Pressable
                style={[styles.actionPill, styles.actionPillGreen]}
                onPress={openPayModal}
              >
                <CreditCard size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.actionPillTextPrimary}>Record Payment</Text>
              </Pressable>
              <Pressable
                style={[styles.actionPill, styles.actionPillWhatsApp]}
                onPress={handleWhatsApp}
              >
                <MessageSquare size={14} color="#fff" strokeWidth={2} />
                <Text style={styles.actionPillTextPrimary}>WhatsApp</Text>
              </Pressable>
            </>
          )}
          <Pressable
            style={[styles.actionPill, styles.actionPillOutline]}
            onPress={handleShare}
          >
            <Share2 size={14} color={Colors.brand600} strokeWidth={2} />
            <Text style={styles.actionPillTextOutline}>Share</Text>
          </Pressable>
          {invoice.status === 'draft' && (
            <Pressable
              style={[styles.actionPill, styles.actionPillOutline]}
              onPress={() => router.push(`/invoices/${invoice.id}-edit` as any)}
            >
              <EditIcon size={14} color={Colors.brand600} strokeWidth={2} />
              <Text style={styles.actionPillTextOutline}>Edit</Text>
            </Pressable>
          )}
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
          {(invoice.balanceDue ?? 0) > 0 && (
            <TotalRow label="Balance Due" value={invoice.balanceDue!} warn />
          )}
        </View>

        {/* Payment History */}
        {payments.length > 0 && (
          <View style={[styles.card, styles.mt12]}>
            <Text style={styles.cardTitle}>Payment History</Text>
            {payments.map((p) => (
              <View key={p.id} style={styles.payRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payMethod}>{PAYMENT_METHOD_LABELS[p.method]}</Text>
                  <Text style={styles.payDate}>{formatDate(p.paymentDate)}{p.reference ? ` · Ref: ${p.reference}` : ''}</Text>
                </View>
                <Text style={styles.payAmount}>₹{formatCurrency(p.amount)}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Delete ${invoice.invoiceNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Record Payment Modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record Payment"
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onPress={() => setPayOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onPress={handleRecordPayment}>Record</Button>
          </>
        }
      >
        <View style={styles.modalBody}>
          <Input
            label="Amount Received (₹)"
            value={payAmount}
            onChangeText={setPayAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Input
            label="Payment Date"
            value={payDate}
            onChangeText={setPayDate}
            placeholder="YYYY-MM-DD"
          />
          <Select
            label="Payment Method"
            value={payMethod}
            options={PAYMENT_METHOD_OPTIONS}
            onValueChange={(v) => setPayMethod(v as PaymentMethod)}
          />
          <Input
            label="Reference / UTR (optional)"
            value={payRef}
            onChangeText={setPayRef}
            placeholder="Transaction ID, Cheque no., etc."
          />
        </View>
      </Modal>
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
        accent && { color: Colors.brand600 },
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
  scroll: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: Colors.textMuted },
  mt12: { marginTop: 12 },

  card: {
    backgroundColor: '#ffffff', borderRadius: Radius.xl,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm,
  },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceNum: { fontSize: 15, fontWeight: '600', color: Colors.brand600, fontVariant: ['tabular-nums'] },
  grandTotal: { fontSize: 28, fontWeight: '800', color: Colors.brand600, fontVariant: ['tabular-nums'], marginBottom: 12 },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  dateVal:   { fontSize: 14, fontWeight: '500', color: Colors.text },

  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full,
  },
  actionPillPrimary:  { backgroundColor: Colors.brand600 },
  actionPillGreen:    { backgroundColor: Colors.ok600 },
  actionPillWhatsApp: { backgroundColor: '#25D366' },
  actionPillOutline:  { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  actionPillTextPrimary: { fontSize: 13, fontWeight: '600', color: Colors.white },
  actionPillTextOutline: { fontSize: 13, fontWeight: '600', color: Colors.brand600 },

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

  payRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  payMethod: { fontSize: 13, fontWeight: '600', color: Colors.text },
  payDate:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  payAmount: { fontSize: 15, fontWeight: '700', color: Colors.ok600, fontVariant: ['tabular-nums'] },

  modalBody: { padding: 20, gap: 14 },
})
