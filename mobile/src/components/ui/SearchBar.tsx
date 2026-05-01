import { useState } from 'react'
import { View, TextInput, Pressable, StyleSheet, ViewStyle } from 'react-native'
import { Search, X } from 'lucide-react-native'
import { Colors, Radius } from '@/constants/theme'

interface SearchBarProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  style?: ViewStyle
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', style }: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[
      styles.container,
      focused && styles.focused,
      style,
    ]}>
      <Search size={16} color={Colors.textMuted} style={styles.icon} />
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
        <Pressable onPress={() => onChangeText('')} style={styles.clearBtn}>
          <X size={14} color={Colors.textMuted} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    gap: 8,
  },
  focused: {
    borderColor: Colors.brand600,
    shadowColor: Colors.brand600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {},
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    height: '100%',
  },
  clearBtn: {
    padding: 2,
  },
})
