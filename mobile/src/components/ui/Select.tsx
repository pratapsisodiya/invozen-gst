import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Menu, Button, Text } from 'react-native-paper'
import { ChevronDown } from 'lucide-react-native'

interface SelectOption {
  label: string
  value: string
}

interface SelectProps {
  label: string
  value: string
  options: SelectOption[]
  onValueChange: (value: string) => void
  disabled?: boolean
}

export function Select({ label, value, options, onValueChange, disabled }: SelectProps) {
  const [visible, setVisible] = useState(false)

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={styles.label}>
        {label}
      </Text>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => !disabled && setVisible(true)}
            contentStyle={styles.buttonContent}
            style={styles.button}
            disabled={disabled}
          >
            <View style={styles.buttonInner}>
              <Text style={styles.buttonText}>
                {selectedOption?.label || 'Select...'}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </View>
          </Button>
        }
      >
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            onPress={() => {
              onValueChange(option.value)
              setVisible(false)
            }}
            title={option.label}
          />
        ))}
      </Menu>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: '#374151',
  },
  button: {
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  buttonContent: {
    justifyContent: 'flex-start',
  },
  buttonInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#1F2937',
  },
})
