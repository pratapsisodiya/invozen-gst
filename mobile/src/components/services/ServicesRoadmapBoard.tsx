import { StyleSheet, Text, View } from 'react-native'
import {
  AlertTriangle,
  BarChart2,
  BookOpen,
  Building2,
  FileText,
  Files,
  Truck,
  Users,
} from 'lucide-react-native'
import { mobileServiceLanes } from '@/constants/servicesRoadmap'
import { Colors, FontFamily, Radius, Shadow } from '@/constants/theme'

const cardIcons = [
  FileText,
  Files,
  AlertTriangle,
  BookOpen,
  Truck,
  Building2,
  BarChart2,
  Users,
]

type Props = {
  eyebrow?: string
  title: string
  description: string
}

export function ServicesRoadmapBoard({
  eyebrow = 'Roadmap',
  title,
  description,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.laneStack}>
        {mobileServiceLanes.map((lane, laneIndex) => (
          <View
            key={lane.id}
            style={[
              styles.laneCard,
              laneIndex === 0 ? styles.laneCardPrimary : styles.laneCardSecondary,
            ]}
          >
            <Text style={styles.laneTitle}>{lane.title}</Text>
            <Text style={styles.laneDescription}>{lane.description}</Text>

            <View style={styles.itemStack}>
              {lane.items.map((item, itemIndex) => {
                const Icon = cardIcons[laneIndex * 4 + itemIndex]

                return (
                  <View key={item.title} style={styles.itemCard}>
                    <View
                      style={[
                        styles.itemIcon,
                        laneIndex === 0 ? styles.itemIconPrimary : styles.itemIconSecondary,
                      ]}
                    >
                      <Icon
                        size={15}
                        color={laneIndex === 0 ? Colors.brand600 : '#b45309'}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemSummary}>{item.summary}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    color: Colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.text,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
  },
  laneStack: {
    gap: 12,
    marginTop: 14,
  },
  laneCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 14,
    ...Shadow.sm,
  },
  laneCardPrimary: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  laneCardSecondary: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  laneTitle: {
    fontSize: 15,
    fontFamily: FontFamily.semibold,
    color: Colors.text,
  },
  laneDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
  },
  itemStack: {
    gap: 10,
    marginTop: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  itemIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconPrimary: {
    backgroundColor: Colors.brand50,
  },
  itemIconSecondary: {
    backgroundColor: '#fef3c7',
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FontFamily.semibold,
    color: Colors.text,
  },
  itemSummary: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
  },
})
