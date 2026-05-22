import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useState, useMemo } from 'react'
import { useRouter } from 'expo-router'
import { AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react-native'
import { TopBar } from '@/components/layout/TopBar'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { generateComplianceEvents, daysUntilDue } from '@/lib/gst/complianceCalendar'
import type { ComplianceEvent } from '@/lib/types/compliance'

function statusLabel(event: ComplianceEvent): string {
  if (event.status === 'filed') return `Filed${event.filedDate ? ` ${event.filedDate}` : ''}`
  if (event.status === 'overdue') {
    const days = Math.abs(daysUntilDue(event.dueDate))
    return `${days} day${days !== 1 ? 's' : ''} overdue`
  }
  const days = daysUntilDue(event.dueDate)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function FilingCard({
  event,
  onMarkFiled,
}: {
  event: ComplianceEvent
  onMarkFiled: (id: string) => void
}) {
  const urgent = event.status === 'overdue' || (event.status === 'pending' && daysUntilDue(event.dueDate) <= 7)

  const cardBg =
    event.status === 'filed' ? Colors.ok50 ?? '#f0fdf4'
    : event.status === 'overdue' ? Colors.err50 ?? '#fef2f2'
    : urgent ? Colors.warn50 ?? '#fffbeb'
    : Colors.white

  const cardBorder =
    event.status === 'filed' ? '#bbf7d0'
    : event.status === 'overdue' ? '#fecaca'
    : urgent ? '#fde68a'
    : Colors.border

  const StatusIcon =
    event.status === 'filed' ? CheckCircle
    : event.status === 'overdue' ? AlertTriangle
    : Clock

  const iconColor =
    event.status === 'filed' ? Colors.ok600
    : event.status === 'overdue' ? Colors.err600
    : urgent ? Colors.warn600
    : Colors.textMuted

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.cardLeft}>
        <StatusIcon size={18} color={iconColor} strokeWidth={2} />
      </View>
      <View style={styles.cardCenter}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.formType}>{event.type}</Text>
          <View style={styles.periodPill}>
            <Text style={styles.periodText}>{event.period}</Text>
          </View>
        </View>
        <Text style={[styles.statusLabel, { color: iconColor }]}>{statusLabel(event)}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.dueDate}>{formatDueDate(event.dueDate)}</Text>
        {event.status !== 'filed' && (
          <Pressable
            style={({ pressed }) => [styles.markBtn, pressed && { opacity: 0.7 }]}
            onPress={() => onMarkFiled(event.id)}
          >
            <Text style={styles.markBtnText}>Mark Filed</Text>
          </Pressable>
        )}
        {event.status === 'filed' && (
          <View style={styles.filedBadge}>
            <Text style={styles.filedBadgeText}>Filed ✓</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default function ComplianceScreen() {
  const router = useRouter()
  const [filedPeriods, setFiledPeriods] = useState<Record<string, { gstr1?: string; gstr3b?: string }>>({})
  const [tab, setTab] = useState<'upcoming' | 'all'>('upcoming')

  const summary = useMemo(() => generateComplianceEvents(filedPeriods), [filedPeriods])

  function handleMarkFiled(id: string) {
    const today = new Date().toISOString().split('T')[0]
    // id format: "gstr1-2026-04" or "gstr3b-2026-04"
    const isGSTR1 = id.startsWith('gstr1-')
    const periodKey = id.replace(/^gstr[13]b?-/, '')
    setFiledPeriods((prev) => ({
      ...prev,
      [periodKey]: {
        ...prev[periodKey],
        ...(isGSTR1 ? { gstr1: today } : { gstr3b: today }),
      },
    }))
  }

  const displayEvents = tab === 'upcoming'
    ? [...summary.overdue, ...summary.upcoming]
    : summary.allEvents

  const hasAlert = summary.overdue.length > 0 ||
    (summary.nextDue !== null && daysUntilDue(summary.nextDue.dueDate) <= 7)

  return (
    <View style={styles.root}>
      <TopBar title="Compliance Calendar" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Alert Banner */}
        {hasAlert && (
          <View style={[
            styles.alertBanner,
            summary.overdue.length > 0 ? styles.alertRed : styles.alertAmber,
          ]}>
            <AlertTriangle size={16} color={summary.overdue.length > 0 ? Colors.err600 : Colors.warn600} strokeWidth={2} />
            <Text style={[
              styles.alertText,
              { color: summary.overdue.length > 0 ? Colors.err600 : Colors.warn600 },
            ]}>
              {summary.overdue.length > 0
                ? `${summary.overdue.length} overdue filing${summary.overdue.length > 1 ? 's' : ''} — file now to avoid penalties`
                : summary.nextDue
                  ? `${summary.nextDue.type} for ${summary.nextDue.period} due in ${daysUntilDue(summary.nextDue.dueDate)} days`
                  : ''}
            </Text>
          </View>
        )}

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Next Due</Text>
            {summary.nextDue ? (
              <>
                <Text style={styles.summaryValue}>{summary.nextDue.type}</Text>
                <Text style={styles.summaryMeta}>{summary.nextDue.period}</Text>
              </>
            ) : (
              <Text style={[styles.summaryValue, { color: Colors.ok600 }]}>All good</Text>
            )}
          </View>

          <View style={[styles.summaryCard, summary.overdue.length > 0 && styles.summaryCardRed]}>
            <Text style={styles.summaryLabel}>Overdue</Text>
            <Text style={[styles.summaryValue, { color: summary.overdue.length > 0 ? Colors.err600 : Colors.ok600 }]}>
              {summary.overdue.length}
            </Text>
            <Text style={styles.summaryMeta}>filings</Text>
          </View>

          <View style={styles.summaryCard}>
            <Calendar size={16} color={Colors.brand600} />
            <Text style={styles.summaryValue}>Monthly</Text>
            <Text style={styles.summaryMeta}>GSTR-1: 11th</Text>
          </View>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabRow}>
          {(['upcoming', 'all'] as const).map((t) => (
            <Pressable
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === 'upcoming' ? 'Upcoming & Overdue' : 'All Filings'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Filing Cards */}
        {displayEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle size={40} color={Colors.ok600} />
            <Text style={styles.emptyTitle}>All filings up to date</Text>
            <Text style={styles.emptySubtitle}>No pending or overdue filings</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {displayEvents.map((event) => (
              <FilingCard key={event.id} event={event} onMarkFiled={handleMarkFiled} />
            ))}
          </View>
        )}

        {/* Info footer */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            GSTR-1 (outward supplies) is due by the 11th of the following month.{'\n'}
            GSTR-3B (tax payment) is due by the 20th of the following month.{'\n'}
            GSTR-9 (annual return) is due by 31 Dec of the following year.
          </Text>
        </View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { padding: 16, paddingBottom: 40 },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertRed: { backgroundColor: Colors.err50 ?? '#fef2f2', borderColor: '#fecaca' },
  alertAmber: { backgroundColor: Colors.warn50 ?? '#fffbeb', borderColor: '#fde68a' },
  alertText: { flex: 1, fontSize: 13, fontWeight: '500' },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 2,
    ...Shadow.sm,
  },
  summaryCardRed: {
    backgroundColor: Colors.err50 ?? '#fef2f2',
    borderColor: '#fecaca',
  },
  summaryLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  summaryMeta: { fontSize: 11, color: Colors.textMuted },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.ink50,
    borderRadius: Radius.lg,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: Colors.white, ...Shadow.sm },
  tabBtnText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  tabBtnTextActive: { color: Colors.text, fontWeight: '600' },

  cardList: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 12,
    ...Shadow.sm,
  },
  cardLeft: { width: 24, alignItems: 'center' },
  cardCenter: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  formType: { fontSize: 14, fontWeight: '700', color: Colors.text },
  periodPill: {
    backgroundColor: Colors.ink50,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  periodText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  statusLabel: { fontSize: 12, fontWeight: '500' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  dueDate: { fontSize: 11, color: Colors.textMuted },
  markBtn: {
    backgroundColor: Colors.brand600,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.md,
  },
  markBtnText: { fontSize: 11, fontWeight: '600', color: Colors.white },
  filedBadge: {
    backgroundColor: Colors.ok50 ?? '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  filedBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.ok600 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted },

  infoBox: {
    marginTop: 24,
    padding: 14,
    backgroundColor: Colors.bgTinted ?? Colors.ink50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
})
