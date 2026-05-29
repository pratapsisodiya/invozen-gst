import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { Colors, FontFamily, Shadow, TopBarHeight } from '@/constants/theme'
import type { ReactNode } from 'react'

interface TopBarProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  right?: ReactNode
}

export function TopBar({ title, showBack, onBack, right }: TopBarProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const handleBack = onBack ?? (() => router.back())

  const backScale = useSharedValue(1)
  const backStyle = useAnimatedStyle(() => ({ transform: [{ scale: backScale.value }] }))

  const paddingTop = Platform.OS === 'android' ? insets.top : 0

  return (
    <View style={[styles.container, { paddingTop }]}>
      <View style={styles.inner}>
        {showBack ? (
          <Animated.View style={backStyle}>
            <Pressable
              onPress={handleBack}
              onPressIn={() => { backScale.value = withSpring(0.88, { damping: 15 }) }}
              onPressOut={() => { backScale.value = withSpring(1, { damping: 15 }) }}
              style={styles.backBtn}
              hitSlop={8}
            >
              <ArrowLeft size={20} color={Colors.text} />
            </Pressable>
          </Animated.View>
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
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
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
    borderRadius: 18,
    backgroundColor: Colors.ink50,
  },
  placeholder: { width: 40 },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  rightSlot: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
})
