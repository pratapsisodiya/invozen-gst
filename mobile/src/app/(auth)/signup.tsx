import { View, StyleSheet } from 'react-native'
import { Text, Button } from 'react-native-paper'
import { useRouter } from 'expo-router'

export default function SignupScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.heading}>
        Sign Up
      </Text>
      <Text variant="bodyLarge" style={styles.body}>
        Signup feature coming soon...
      </Text>
      <Button
        mode="text"
        onPress={() => router.back()}
        style={styles.button}
      >
        Back to Login
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FEF9F3',
  },
  heading: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  body: {
    marginBottom: 24,
    textAlign: 'center',
    color: '#6B7280',
  },
  button: {
    marginTop: 8,
  },
})
