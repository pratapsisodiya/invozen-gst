import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Slot, useRouter, useSegments } from 'expo-router'
import React, { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { PaperProvider } from 'react-native-paper'
import { useAuthStore } from '@/stores/authStore'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const { isAuthenticated } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()

  // Auth guard - redirect based on authentication status
  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)'

    if (!isAuthenticated && !inAuthGroup) {
      // User not authenticated, redirect to login
      router.replace('/login')
    } else if (isAuthenticated && inAuthGroup) {
      // User authenticated but in auth screens, redirect to app
      router.replace('/dashboard')
    }
  }, [isAuthenticated, segments])

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PaperProvider>
        <Slot />
      </PaperProvider>
    </ThemeProvider>
  )
}
