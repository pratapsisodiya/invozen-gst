import { View, Text, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated'
import { useEffect } from 'react'
import { Colors, FontFamily, Radius, Shadow } from '@/constants/theme'
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
  accentColor?: string
  index?: number
}

export function KpiCard({
  title, value, isAmount, trend, subtext, subtextColor = 'default', icon,
  accentColor = Colors.brand600,
  index = 0,
}: KpiCardProps) {
  const displayValue = isAmount && typeof value === 'number'
    ? `₹${formatCurrency(value)}`
    : String(value)

  const subtextColorMap: Record<SubtextColor, string> = {
    default: Colors.textMuted,
    warn:    Colors.warn600,
    error:   Colors.err600,
    success: Colors.ok600,
  }

  const opacity   = useSharedValue(0)
  const translateY = useSharedValue(16)

  useEffect(() => {
    opacity.value    = withDelay(index * 80, withSpring(1, { damping: 18 }))
    translateY.value = withDelay(index * 80, withSpring(0, { damping: 18 }))
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {icon}
        </View>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{displayValue}</Text>
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
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    flexDirection: 'row',
    ...Shadow.sm,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: Radius.xl,
    borderBottomLeftRadius: Radius.xl,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    color: Colors.text,
    lineHeight: 28,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
  },
  subtext: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },
})
