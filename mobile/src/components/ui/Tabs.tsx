import { ScrollView, Pressable, View, Text, StyleSheet } from 'react-native'
import { Colors, Radius } from '@/constants/theme'

interface Tab {
  key: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeKey: string
  onChange: (key: string) => void
  variant?: 'underline' | 'pill'
}

export function Tabs({ tabs, activeKey, onChange, variant = 'underline' }: TabsProps) {
  if (variant === 'pill') {
    return (
      <View style={pillStyles.container}>
        {tabs.map((tab) => {
          const active = tab.key === activeKey
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={[pillStyles.tab, active && pillStyles.activeTab]}
            >
              <Text style={[pillStyles.label, active && pillStyles.activeLabel]}>
                {tab.label}
              </Text>
              {tab.count !== undefined && (
                <View style={[pillStyles.badge, active && pillStyles.activeBadge]}>
                  <Text style={[pillStyles.badgeText, active && pillStyles.activeBadgeText]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>
    )
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={underlineStyles.scroll}>
      <View style={underlineStyles.container}>
        {tabs.map((tab) => {
          const active = tab.key === activeKey
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={[underlineStyles.tab, active && underlineStyles.activeTab]}
            >
              <Text style={[underlineStyles.label, active && underlineStyles.activeLabel]}>
                {tab.label}
              </Text>
              {tab.count !== undefined && (
                <View style={[underlineStyles.badge, active && underlineStyles.activeBadge]}>
                  <Text style={[underlineStyles.badgeText, active && underlineStyles.activeBadgeText]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>
    </ScrollView>
  )
}

const underlineStyles = StyleSheet.create({
  scroll: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  container: { flexDirection: 'row' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab:  { borderBottomColor: Colors.brand600 },
  label:      { fontSize: 14, fontWeight: '500', color: Colors.textMuted },
  activeLabel:{ color: Colors.brand700 },
  badge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.ink100,
  },
  activeBadge:     { backgroundColor: Colors.brand100 },
  badgeText:       { fontSize: 11, fontWeight: '600', color: Colors.ink500 },
  activeBadgeText: { color: Colors.brand700 },
})

const pillStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  activeTab:  { backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  label:      { fontSize: 14, fontWeight: '500', color: Colors.textMuted },
  activeLabel:{ color: Colors.brand700 },
  badge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.ink200,
  },
  activeBadge:     { backgroundColor: Colors.brand100 },
  badgeText:       { fontSize: 11, fontWeight: '600', color: Colors.ink500 },
  activeBadgeText: { color: Colors.brand700 },
})
