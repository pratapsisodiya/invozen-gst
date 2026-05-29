import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Colors, Radius, Shadow } from '@/constants/theme'

export default function SignupScreen() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>G</Text>
          </View>
          <Text style={styles.appName}>Invozen GST</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Get Started</Text>
          <Text style={styles.subheading}>Set up your GST account in minutes</Text>

          <Input label="Full Name" value={name} onChangeText={setName} placeholder="Your Name" />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="your@email.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Create a password"
          />

          <Button variant="primary" size="lg" onPress={() => {}} style={styles.btn}>
            Create Account
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 64, height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Colors.brand600,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    ...Shadow.md,
  },
  logoLetter: { color: '#fff', fontSize: 28, fontWeight: '800' },
  appName:    { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  tagline:    { fontSize: 14, color: Colors.textMuted },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  heading:    { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subheading: { fontSize: 14, color: Colors.textMuted, marginBottom: 24 },
  btn:        { marginTop: 8 },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: Colors.textMuted },
  link:       { fontSize: 14, color: Colors.brand600, fontWeight: '600' },
})
