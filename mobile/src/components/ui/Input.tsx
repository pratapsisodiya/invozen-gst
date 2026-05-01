import { TextInput, TextInputProps } from 'react-native-paper'
import { StyleSheet } from 'react-native'

export function Input(props: TextInputProps) {
  return (
    <TextInput
      mode="outlined"
      outlineColor="#E5E7EB"
      activeOutlineColor="#7C3AED"
      style={[styles.input, props.style]}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'white',
  },
})
