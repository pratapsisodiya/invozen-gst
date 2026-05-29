import { Pressable, Text, StyleSheet, ActivityIndicator, View, ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { Colors, FontFamily, Radius } from '@/constants/theme'

interface ButtonProps {
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: string
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export function Button({
  onPress,
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled = false,
  style,
  leftIcon,
  rightIcon,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={[animStyle, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => { if (!isDisabled) scale.value = withSpring(0.94, { damping: 12 }) }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12 }) }}
        style={[
          styles.base,
          styles[variant],
          styles[`size_${size}`],
          fullWidth && styles.fullWidthInner,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? Colors.white : Colors.brand600}
          />
        ) : (
          <>
            {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
            <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
              {children}
            </Text>
            {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  fullWidth:      { width: '100%' },
  fullWidthInner: { width: '100%' },
  disabled:       { opacity: 0.5 },

  primary:   { backgroundColor: Colors.brand600 },
  secondary: { backgroundColor: Colors.brand50 },
  ghost:     { backgroundColor: 'transparent' },
  outline:   { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.border },

  size_sm: { paddingHorizontal: 14, paddingVertical: 7, gap: 6 },
  size_md: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  size_lg: { paddingHorizontal: 24, paddingVertical: 14, gap: 8 },

  text: {},

  text_primary:   { color: Colors.white,    fontFamily: FontFamily.semibold },
  text_secondary: { color: Colors.brand700, fontFamily: FontFamily.semibold },
  text_ghost:     { color: Colors.brand700, fontFamily: FontFamily.semibold },
  text_outline:   { color: Colors.text2,    fontFamily: FontFamily.medium },

  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 14 },
  textSize_lg: { fontSize: 15 },

  iconLeft:  { marginRight: 0 },
  iconRight: { marginLeft: 0 },
} as any)
