import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'
import * as SplashScreen from 'expo-splash-screen'
import { useAuthStore } from '@/stores/authStore'
import { ToastContainer } from '@/components/ui/Toast'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  useEffect(() => {
    if (!fontsLoaded) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login')
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, segments, fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <Slot />
        <ToastContainer />
      </View>
    </SafeAreaProvider>
  )
}
