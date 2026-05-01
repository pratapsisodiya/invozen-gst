import { View, Text, Pressable, StyleSheet, Platform, StatusBar } from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { Colors, Shadow, TopBarHeight } from '@/constants/theme'
import type { ReactNode } from 'react'

interface TopBarProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  right?: ReactNode
}

export function TopBar({ title, showBack, onBack, right }: TopBarProps) {
  const router = useRouter()
  const handleBack = onBack ?? (() => router.back())

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {showBack ? (
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.rightSlot}>{right ?? null}</View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white ?? '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
    ...Shadow.sm,
  },
  inner: {
    height: TopBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  placeholder: { width: 40 },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  rightSlot: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
})
