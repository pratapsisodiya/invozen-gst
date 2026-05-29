import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable,
} from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Colors, FontFamily, Radius, Shadow } from '@/constants/theme'
import { Shield, Zap, BarChart2 } from 'lucide-react-native'

const FEATURES = [
  { icon: Zap,       label: 'Instant GST Invoices' },
  { icon: Shield,    label: 'GSTIN Verified'       },
  { icon: BarChart2, label: 'Reports & Filing'      },
]

export default function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const login  = useAuthStore((s) => s.login)
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const logoScale   = useSharedValue(0.7)
  const logoOpacity = useSharedValue(0)
  const cardTranslateY = useSharedValue(40)
  const cardOpacity    = useSharedValue(0)

  useEffect(() => {
    logoScale.value   = withSpring(1, { damping: 14, stiffness: 180 })
    logoOpacity.value = withSpring(1, { damping: 18 })
    cardTranslateY.value = withDelay(200, withSpring(0, { damping: 18 }))
    cardOpacity.value    = withDelay(200, withSpring(1, { damping: 18 }))
  }, [])

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }))
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
    opacity: cardOpacity.value,
  }))

  const handleLogin = () => {
    setLoading(true)
    setTimeout(() => {
      login({
        id:             'mock-user-1',
        email:          email || 'demo@invozen.com',
        name:           'Demo User',
        phone:          '',
        role:           'owner',
        avatarInitials: 'DU',
        createdAt:      new Date().toISOString(),
      })
      setLoading(false)
      router.replace('/dashboard')
    }, 600)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Branding */}
        <Animated.View style={[styles.logoArea, logoStyle]}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>G</Text>
          </View>
          <Text style={styles.appName}>Invozen GST</Text>
          <Text style={styles.tagline}>GST Invoicing for India</Text>

          <View style={styles.featureRow}>
            {FEATURES.map(({ icon: Icon, label }) => (
              <View key={label} style={styles.featureChip}>
                <Icon size={12} color={Colors.brand600} />
                <Text style={styles.featureText}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Form Card */}
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in to continue</Text>

          <View style={styles.inputs}>
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
              placeholder="••••••••"
            />
          </View>

          <Pressable style={styles.forgotRow} onPress={() => {}}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Button variant="primary" size="lg" onPress={handleLogin} loading={loading} fullWidth>
            Sign In
          </Button>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button variant="outline" size="lg" onPress={handleLogin} fullWidth>
            Continue as Demo
          </Button>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push('/signup' as any)}>
            <Text style={styles.link}>Sign up free</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  logoArea:   { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...Shadow.lg,
  },
  logoLetter: { color: '#fff', fontSize: 32, fontFamily: FontFamily.extrabold },
  appName:    { fontSize: 26, fontFamily: FontFamily.extrabold, color: Colors.text, marginBottom: 6, letterSpacing: -0.5 },
  tagline:    { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textMuted, marginBottom: 16 },

  featureRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.brand50,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.brand200,
  },
  featureText: { fontSize: 11, fontFamily: FontFamily.semibold, color: Colors.brand700 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    ...Shadow.md,
  },
  heading:    { fontSize: 22, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: 4, letterSpacing: -0.3 },
  subheading: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textMuted, marginBottom: 24 },

  inputs: { gap: 4, marginBottom: 8 },

  forgotRow:  { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 13, fontFamily: FontFamily.medium, color: Colors.brand600 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textFaint },

  footer:     { flexDirection: 'row', justifyContent: 'center', paddingTop: 8 },
  footerText: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textMuted },
  link:       { fontSize: 14, fontFamily: FontFamily.semibold, color: Colors.brand600 },
})
