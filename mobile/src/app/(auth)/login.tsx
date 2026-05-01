import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button } from 'react-native-paper'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'expo-router'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const router = useRouter()

  const handleLogin = async () => {
    // Mock login for MVP - no backend yet
    setLoading(true)

    setTimeout(() => {
      login({
        id: 'mock-user-1',
        email: email || 'demo@invozen.com',
        name: 'Demo User',
        businessId: 'mock-business-1',
        role: 'owner',
      })
      setLoading(false)
      router.replace('/dashboard')
    }, 500)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={styles.appName}>Invozen GST</Text>
          <Text style={styles.tagline}>GST Invoicing Made Simple</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text variant="headlineSmall" style={styles.heading}>
            Welcome Back
          </Text>
          <Text variant="bodyMedium" style={styles.subheading}>
            Sign in to your account
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholder="your@email.com"
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            placeholder="••••••••"
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            buttonColor="#7C3AED"
          >
            Sign In
          </Button>

          <View style={styles.footer}>
            <Text variant="bodySmall" style={styles.footerText}>
              Don't have an account?{' '}
              <Text
                style={styles.link}
                onPress={() => router.push('/signup')}
              >
                Sign up
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF9F3',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    width: '100%',
  },
  heading: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
  },
  subheading: {
    color: '#6B7280',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#6B7280',
  },
  link: {
    color: '#7C3AED',
    fontWeight: '600',
  },
})
