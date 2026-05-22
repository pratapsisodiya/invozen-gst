import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useMemo } from 'react'
import { useRouter } from 'expo-router'
import { ShoppingCart, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react-native'
import { TopBar } from '@/components/layout/TopBar'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { usePurchaseStore } from '@/stores/purchaseStore'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { reconcileITCByMonth } from '@/lib/gst/itcReconciliation'
import type { ITCMonthSummary } from '@/lib/gst/itcReconciliation'
import { formatCurrency } from '@/lib/utils/formatters'

function KpiBox({
  label, value, subtext, color = Colors.text, bg = Colors.white, border = Colors.border,
}: {
  label: string
  value: string
  subtext?: string
  color?: string
  bg?: string
  border?: string
}) {
  return (
    <View style={[styles.kpiBox, { backgroundColor: bg, borderColor: border }]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      {subtext ? <Text style={styles.kpiSubtext}>{subtext}</Text> : null}
    </View>
  )
}

function MonthRow({ row }: { row: ITCMonthSummary }) {
  return (
    <View style={styles.monthRow}>
      <View style={styles.monthLeft}>
        <Text style={styles.monthLabel}>{row.label}</Text>
        <Text style={styles.monthCount}>{row.purchaseCount} purchase{row.purchaseCount !== 1 ? 's' : ''}</Text>
      </View>
      <View style={styles.monthMid}>
        {row.total > 0 ? (
          <Text style={styles.monthTotal}>₹{formatCurrency(row.total)}</Text>
        ) : (
          <Text style={styles.monthZero}>—</Text>
        )}
      </View>
      <View style={styles.monthRight}>
        {row.claimedCount > 0 && (
          <View style={styles.chip}>
            <CheckCircle size={10} color={Colors.ok600} strokeWidth={2} />
            <Text style={[styles.chipText, { color: Colors.ok600 }]}>{row.claimedCount}</Text>
          </View>
        )}
        {row.eligibleCount > 0 && (
          <View style={[styles.chip, styles.chipAmber]}>
            <Clock size={10} color={Colors.warn600} strokeWidth={2} />
            <Text style={[styles.chipText, { color: Colors.warn600 }]}>{row.eligibleCount}</Text>
          </View>
        )}
        {row.ineligibleCount > 0 && (
          <View style={[styles.chip, styles.chipRed]}>
            <AlertTriangle size={10} color={Colors.err600} strokeWidth={2} />
            <Text style={[styles.chipText, { color: Colors.err600 }]}>{row.ineligibleCount}</Text>
          </View>
        )}
        {row.purchaseCount === 0 && (
          <Text style={styles.noData}>—</Text>
        )}
      </View>
    </View>
  )
}

export default function ITCReconciliationScreen() {
  const router = useRouter()
  const purchases = usePurchaseStore((s) => s.purchases)
  const getItcSummary = usePurchaseStore((s) => s.getItcSummary)
  const invoices = useInvoiceStore((s) => s.invoices)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const summary = getItcSummary()

  const monthlyData = useMemo(() => reconcileITCByMonth(purchases, 6), [purchases])

  const outputTax = useMemo(() => {
    return invoices
      .filter((i) => i.status === 'paid' &&
        new Date(i.invoiceDate).getMonth() + 1 === currentMonth &&
        new Date(i.invoiceDate).getFullYear() === currentYear)
      .reduce((s, i) => s + i.totalTax, 0)
  }, [invoices, currentMonth, currentYear])

  const currentMonthITC = useMemo(() => {
    return purchases
      .filter((p) => {
        const d = new Date(p.invoiceDate)
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear &&
          (p.itcStatus === 'eligible' || p.itcStatus === 'claimed')
      })
      .reduce((s, p) => s + p.itcAvailable, 0)
  }, [purchases, currentMonth, currentYear])

  const netPayable = Math.max(0, outputTax - currentMonthITC)

  return (
    <View style={styles.root}>
      <TopBar title="ITC Reconciliation" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <KpiBox
            label="ITC Available"
            value={`₹${formatCurrency(summary.available)}`}
            subtext="Eligible + Claimed"
          />
          <KpiBox
            label="ITC Claimed"
            value={`₹${formatCurrency(summary.claimed)}`}
            color={Colors.ok600}
            bg={Colors.ok50}
            border="#bbf7d0"
          />
          <KpiBox
            label="Pending Claim"
            value={`₹${formatCurrency(summary.pending)}`}
            subtext={summary.pending > 0 ? 'Not yet claimed' : undefined}
            color={summary.pending > 0 ? Colors.warn600 : Colors.text}
            bg={summary.pending > 0 ? Colors.warn50 : Colors.white}
            border={summary.pending > 0 ? '#fde68a' : Colors.border}
          />
          <KpiBox
            label="Net GST Payable (MTD)"
            value={`₹${formatCurrency(netPayable)}`}
            subtext={`Out ₹${outputTax.toFixed(0)} − ITC ₹${currentMonthITC.toFixed(0)}`}
          />
        </View>

        {/* Monthly Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Monthly ITC Breakdown</Text>
            <Pressable onPress={() => router.push('/purchases' as any)}>
              <Text style={styles.sectionLink}>View purchases →</Text>
            </Pressable>
          </View>

          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colHead, { flex: 2 }]}>Period</Text>
              <Text style={[styles.colHead, { flex: 2, textAlign: 'right' }]}>Total ITC</Text>
              <Text style={[styles.colHead, { flex: 2, textAlign: 'right' }]}>Status</Text>
            </View>
            {monthlyData.map((row) => (
              <MonthRow key={`${row.year}-${row.month}`} row={row} />
            ))}
          </View>
        </View>

        {/* Warning banner */}
        {summary.pending > 0 && (
          <Pressable
            style={styles.warningBanner}
            onPress={() => router.push('/purchases' as any)}
          >
            <AlertTriangle size={16} color={Colors.warn600} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>
                ₹{formatCurrency(summary.pending)} in ITC not yet claimed
              </Text>
              <Text style={styles.warningBody}>
                Claim in GSTR-3B before the 20th to reduce your net tax liability.
              </Text>
            </View>
            <ChevronRight size={16} color={Colors.warn600} />
          </Pressable>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <CheckCircle size={12} color={Colors.ok600} strokeWidth={2} />
            <Text style={styles.legendText}>Claimed — filed in GSTR-3B</Text>
          </View>
          <View style={styles.legendRow}>
            <Clock size={12} color={Colors.warn600} strokeWidth={2} />
            <Text style={styles.legendText}>Pending — eligible but not yet claimed</Text>
          </View>
          <View style={styles.legendRow}>
            <AlertTriangle size={12} color={Colors.err600} strokeWidth={2} />
            <Text style={styles.legendText}>Blocked — ineligible or blocked ITC</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { padding: 16, paddingBottom: 40 },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  kpiBox: {
    width: '47%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 14,
    gap: 2,
    ...Shadow.sm,
  },
  kpiLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kpiValue: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  kpiSubtext: { fontSize: 11, color: Colors.textMuted },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text2 },
  sectionLink: { fontSize: 13, color: Colors.brand600, fontWeight: '500' },

  tableCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colHead: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  monthLeft: { flex: 2 },
  monthLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  monthCount: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  monthMid: { flex: 2, alignItems: 'flex-end' },
  monthTotal: { fontSize: 14, fontWeight: '600', color: Colors.text, fontVariant: ['tabular-nums'] },
  monthZero: { fontSize: 14, color: Colors.textMuted },
  monthRight: { flex: 2, flexDirection: 'row', justifyContent: 'flex-end', gap: 4, flexWrap: 'wrap' },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.ok50,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  chipAmber: { backgroundColor: Colors.warn50 },
  chipRed: { backgroundColor: Colors.err50 },
  chipText: { fontSize: 11, fontWeight: '600' },
  noData: { fontSize: 13, color: Colors.textMuted },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: Radius.xl,
    backgroundColor: Colors.warn50,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 16,
  },
  warningTitle: { fontSize: 13, fontWeight: '600', color: Colors.warn600 },
  warningBody: { fontSize: 12, color: Colors.warn600, marginTop: 2 },

  legend: {
    gap: 8,
    padding: 14,
    backgroundColor: Colors.ink50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendText: { fontSize: 12, color: Colors.textMuted },
})
