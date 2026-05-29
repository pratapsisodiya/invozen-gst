import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, FlatList, ViewStyle } from 'react-native'
import { ChevronDown, Check } from 'lucide-react-native'
import { Colors, Radius, Shadow } from '@/constants/theme'

interface SelectOption { label: string; value: string }

interface SelectProps {
  label?: string
  value: string
  options: SelectOption[]
  onValueChange: (val: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  containerStyle?: ViewStyle
  required?: boolean
}

export function Select({ label, value, options, onValueChange, placeholder = 'Select...', error, disabled, containerStyle, required }: SelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}{required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[
          styles.trigger,
          error ? styles.triggerError : undefined,
          disabled ? styles.disabled : undefined,
        ]}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color={Colors.textMuted} />
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={() => { onValueChange(item.value); setOpen(false) }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.activeOption]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Check size={16} color={Colors.brand600} />}
                </Pressable>
              )}
              style={{ maxHeight: 300 }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.text2, marginBottom: 6 },
  required: { color: Colors.err600 },
  trigger: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
  },
  triggerError: { borderColor: Colors.err600 },
  disabled:     { opacity: 0.5 },
  triggerText:  { fontSize: 14, color: Colors.text, flex: 1 },
  placeholder:  { color: Colors.textFaint },
  error:        { fontSize: 12, color: Colors.err600, marginTop: 4 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    padding: 32,
  },
  menu: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  optionPressed: { backgroundColor: Colors.ink50 },
  optionText:    { fontSize: 14, color: Colors.text },
  activeOption:  { color: Colors.brand600, fontWeight: '600' },
})
