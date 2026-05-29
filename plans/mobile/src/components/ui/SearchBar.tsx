import { useState } from 'react'
import { View, TextInput, Pressable, StyleSheet, ViewStyle } from 'react-native'
import { Search, X } from 'lucide-react-native'
import { Colors, FontFamily, Radius } from '@/constants/theme'

interface SearchBarProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  style?: ViewStyle
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', style }: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.container, focused && styles.focused, style]}>
      <Search size={16} color={focused ? Colors.brand600 : Colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textFaint}
        style={styles.input}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} style={styles.clearBtn} hitSlop={6}>
          <View style={styles.clearIcon}>
            <X size={10} color={Colors.white} />
          </View>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  focused: {
    borderColor: Colors.brand600,
    backgroundColor: Colors.white,
    shadowColor: Colors.brand600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    height: '100%',
  },
  clearBtn: { padding: 2 },
  clearIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
