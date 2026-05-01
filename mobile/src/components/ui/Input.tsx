import { useState, forwardRef } from 'react'
import { View, Text, TextInput, TextInputProps, StyleSheet, ViewStyle } from 'react-native'
import { Colors, Radius } from '@/constants/theme'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  helper?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerStyle?: ViewStyle
  required?: boolean
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  containerStyle,
  required,
  style,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false)

  const borderColor = error
    ? Colors.err600
    : focused
    ? Colors.brand600
    : Colors.border

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={[
        styles.inputWrapper,
        { borderColor },
        focused && styles.focused,
        props.editable === false && styles.disabled,
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : undefined,
            rightIcon ? styles.inputWithRight : undefined,
            style,
          ]}
          placeholderTextColor={Colors.textFaint}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {helper && !error && <Text style={styles.helper}>{helper}</Text>}
    </View>
  )
})

Input.displayName = 'Input'

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text2,
    marginBottom: 6,
  },
  required: { color: Colors.err600 },
  inputWrapper: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
  },
  focused: {
    // Shadow-like ring effect
    shadowColor: Colors.brand600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  disabled: { opacity: 0.5 },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
  },
  inputWithLeft:  { paddingLeft: 36 },
  inputWithRight: { paddingRight: 36 },
  leftIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: 10,
    zIndex: 1,
  },
  error:  { fontSize: 12, color: Colors.err600, marginTop: 4 },
  helper: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
})
