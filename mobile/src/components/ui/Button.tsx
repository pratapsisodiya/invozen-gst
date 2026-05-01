import { Pressable, Text, StyleSheet, ActivityIndicator, View, ViewStyle, TextStyle } from 'react-native'
import { Colors, Radius } from '@/constants/theme'

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

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles[`${variant}_pressed`],
        style,
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
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },

  // Variants
  primary:   { backgroundColor: Colors.brand600 },
  secondary: { backgroundColor: Colors.brand50 },
  ghost:     { backgroundColor: 'transparent' },
  outline:   { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },

  // Pressed states
  primary_pressed:   { backgroundColor: Colors.brand700 },
  secondary_pressed: { backgroundColor: Colors.brand100 },
  ghost_pressed:     { backgroundColor: Colors.brand50 },
  outline_pressed:   { backgroundColor: Colors.ink50, borderColor: Colors.brand600 },

  // Sizes
  size_sm: { paddingHorizontal: 14, paddingVertical: 6, gap: 6 },
  size_md: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  size_lg: { paddingHorizontal: 24, paddingVertical: 12, gap: 8 },

  // Text base
  text: { fontWeight: '500' },

  // Text by variant
  text_primary:   { color: Colors.white },
  text_secondary: { color: Colors.brand700 },
  text_ghost:     { color: Colors.brand700 },
  text_outline:   { color: Colors.text2 },

  // Text sizes
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 14 },
  textSize_lg: { fontSize: 15 },

  iconLeft:  { marginRight: 0 },
  iconRight: { marginLeft: 0 },
})
