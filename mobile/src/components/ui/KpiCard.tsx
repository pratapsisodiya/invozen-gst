import { View, Text, StyleSheet } from 'react-native'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { formatCurrency } from '@/lib/utils/formatters'
import { TrendingUp, TrendingDown } from 'lucide-react-native'

type SubtextColor = 'default' | 'warn' | 'error' | 'success'

interface KpiCardProps {
  title: string
  value: number | string
  isAmount?: boolean
  trend?: { value: number; label: string }
  subtext?: string
  subtextColor?: SubtextColor
  icon?: React.ReactNode
}

export function KpiCard({ title, value, isAmount, trend, subtext, subtextColor = 'default', icon }: KpiCardProps) {
  const displayValue = isAmount && typeof value === 'number'
    ? `₹${formatCurrency(value)}`
    : String(value)

  const subtextColorMap: Record<SubtextColor, string> = {
    default: Colors.textMuted,
    warn:    Colors.warn600,
    error:   Colors.err600,
    success: Colors.ok600,
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon}
      </View>
      <Text style={styles.value}>{displayValue}</Text>
      {trend && (
        <View style={styles.trendRow}>
          {trend.value >= 0
            ? <TrendingUp size={12} color={Colors.ok600} />
            : <TrendingDown size={12} color={Colors.err600} />
          }
          <Text style={[styles.trendText, { color: trend.value >= 0 ? Colors.ok600 : Colors.err600 }]}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </Text>
        </View>
      )}
      {subtext && (
        <Text style={[styles.subtext, { color: subtextColorMap[subtextColor] }]}>
          {subtext}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 28,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtext: {
    fontSize: 12,
  },
})
