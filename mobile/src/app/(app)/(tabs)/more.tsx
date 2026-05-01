import { View, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text variant="bodyLarge">More screen coming soon...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF9F3',
  },
})
