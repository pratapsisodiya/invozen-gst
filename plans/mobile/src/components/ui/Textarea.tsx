import { useState } from 'react'
import { View, Text, TextInput, TextInputProps, StyleSheet, ViewStyle } from 'react-native'
import { Colors, Radius } from '@/constants/theme'

interface TextareaProps extends TextInputProps {
  label?: string
  error?: string
  helper?: string
  containerStyle?: ViewStyle
  rows?: number
}

export function Textarea({ label, error, helper, containerStyle, rows = 3, style, ...props }: TextareaProps) {
  const [focused, setFocused] = useState(false)

  const borderColor = error
    ? Colors.err600
    : focused
    ? Colors.brand600
    : Colors.border

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        multiline
        textAlignVertical="top"
        style={[
          styles.textarea,
          { borderColor, minHeight: rows * 24 },
          focused && styles.focused,
          style,
        ]}
        placeholderTextColor={Colors.textFaint}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {helper && !error && <Text style={styles.helper}>{helper}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.text2, marginBottom: 6 },
  textarea: {
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  focused: {
    shadowColor: Colors.brand600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  error:  { fontSize: 12, color: Colors.err600, marginTop: 4 },
  helper: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
})
