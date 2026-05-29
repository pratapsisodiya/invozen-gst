import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, ViewStyle } from 'react-native'
import { Colors, Radius } from '@/constants/theme'

interface SkeletonLoaderProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

export function SkeletonLoader({ width = '100%', height = 16, borderRadius = Radius.sm, style }: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: Colors.surface2, opacity }, style]}
    />
  )
}

export function SkeletonCard() {
  return (
    <>
      <SkeletonLoader width={96} height={12} style={styles.mb8} />
      <SkeletonLoader width={160} height={28} style={styles.mb8} />
      <SkeletonLoader width={80} height={12} />
    </>
  )
}

const styles = StyleSheet.create({
  mb8: { marginBottom: 8 },
})
