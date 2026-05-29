import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useState, useMemo } from 'react'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { TopBar } from '@/components/layout/TopBar'
import { Tabs } from '@/components/ui/Tabs'
import { Select } from '@/components/ui/Select'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { formatCurrency } from '@/lib/utils/formatters'

const MONTHS = [
  { label: 'January', value: '1' }, { label: 'February', value: '2' },
  { label: 'March',   value: '3' }, { label: 'April',    value: '4' },
  { label: 'May',     value: '5' }, { label: 'June',     value: '6' },
  { label: 'July',    value: '7' }, { label: 'August',   value: '8' },
  { label: 'September', value: '9' }, { label: 'October', value: '10' },
  { label: 'November', value: '11' }, { label: 'December', value: '12' },
]

const now = new Date()
const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = now.getFullYear() - i
  return { label: String(y), value: String(y) }
})

const REPORT_TABS = [
  { key: 'gstr1', label: 'GSTR-1' },
  { key: 'gstr3b', label: 'GSTR-3B' },
]

export default function ReportsScreen() {
  const invoices   = useInvoiceStore((s) => s.invoices)
  const [tab, setTab]     = useState('gstr1')
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear]   = useState(String(now.getFullYear()))

  const periodInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.status === 'void') return false
      const d = new Date(inv.invoiceDate)
      return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year)
    })
  }, [invoices, month, year])

  const totals = useMemo(() => {
    let taxable = 0, cgst = 0, sgst = 0, igst = 0, total = 0
    periodInvoices.forEach((inv) => {
      const i = inv as any
      taxable += i.taxableValue ?? i.taxableAmount ?? (inv.grandTotal - inv.totalTax)
      total   += inv.grandTotal
      cgst    += i.cgstTotal ?? i.totalCgst ?? 0
      sgst    += i.sgstTotal ?? i.totalSgst ?? 0
      igst    += i.igstTotal ?? i.totalIgst ?? 0
    })
    return { taxable, cgst, sgst, igst, totalTax: cgst + sgst + igst, total }
  }, [periodInvoices])

  const b2b = periodInvoices.filter((i) => i.supplyType === 'intra' || (i as any).customerSnapshot?.gstin || (i as any).customerGstin)
  const b2c = periodInvoices.filter((i) => !(i as any).customerSnapshot?.gstin && !(i as any).customerGstin)

  return (
    <View style={styles.root}>
      <TopBar title="GST Reports" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodRow}>
          <Select
            label="Month"
            value={month}
            options={MONTHS}
            onValueChange={setMonth}
            containerStyle={styles.monthSelect}
          />
          <Select
            label="Year"
            value={year}
            options={YEARS}
            onValueChange={setYear}
            containerStyle={styles.yearSelect}
          />
        </View>

        <View style={styles.tabs}>
          <Tabs tabs={REPORT_TABS} activeKey={tab} onChange={setTab} />
        </View>

        {tab === 'gstr1' && (
          <>
            {/* B2B */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>B2B Invoices ({b2b.length})</Text>
              <View style={styles.card}>
                <Row label="Taxable Value" value={totals.taxable} />
                <Row label="CGST"          value={totals.cgst} />
                <Row label="SGST"          value={totals.sgst} />
                <Row label="IGST"          value={totals.igst} />
                <Row label="Total Tax"     value={totals.totalTax} bold />
                <Row label="Invoice Total" value={totals.total} bold accent />
              </View>
            </View>

            {/* B2C */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>B2C Invoices ({b2c.length})</Text>
              <View style={styles.card}>
                <Row label="Invoices" value={b2c.length} currency={false} />
                <Row label="Total Value" value={b2c.reduce((s, i) => s + i.grandTotal, 0)} bold accent />
              </View>
            </View>
          </>
        )}

        {tab === 'gstr3b' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3.1 — Output Tax Liability</Text>
              <View style={styles.card}>
                <Row label="Taxable Turnover" value={totals.taxable} />
                <Row label="CGST"             value={totals.cgst} />
                <Row label="SGST"             value={totals.sgst} />
                <Row label="IGST"             value={totals.igst} />
                <Row label="Total Tax Payable" value={totals.totalTax} bold accent />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4 — Input Tax Credit (ITC)</Text>
              <View style={styles.card}>
                <Row label="ITC Available" value={0} />
                <Row label="ITC Utilized"  value={0} />
                <Row label="Net ITC"       value={0} bold />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Net Tax Payable</Text>
              <View style={[styles.card, styles.netCard]}>
                <Text style={styles.netLabel}>Total Payable</Text>
                <Text style={styles.netValue}>₹{formatCurrency(totals.totalTax)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function Row({ label, value, bold, accent, currency = true }: {
  label: string; value: number; bold?: boolean; accent?: boolean; currency?: boolean
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, bold && rowStyles.bold]}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.bold, accent && rowStyles.accent]}>
        {currency ? `₹${formatCurrency(value)}` : String(value)}
      </Text>
    </View>
  )
}
const rowStyles = StyleSheet.create({
  row:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  label:  { fontSize: 14, color: Colors.text2 },
  value:  { fontSize: 14, color: Colors.text, fontVariant: ['tabular-nums'] },
  bold:   { fontWeight: '600' },
  accent: { color: Colors.brand600 },
})

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { padding: 16, paddingBottom: 32 },

  periodRow:   { flexDirection: 'row', gap: 12 },
  monthSelect: { flex: 2 },
  yearSelect:  { flex: 1 },
  tabs:        { marginBottom: 20 },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text2, marginBottom: 10 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm,
  },
  netCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  netLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  netValue: { fontSize: 22, fontWeight: '800', color: Colors.brand600, fontVariant: ['tabular-nums'] },
})
