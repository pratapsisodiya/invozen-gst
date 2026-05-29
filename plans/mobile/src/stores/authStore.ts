import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '@/lib/types/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  onboardingComplete: boolean
  login: (user: User) => void
  logout: () => void
  completeOnboarding: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      onboardingComplete: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      completeOnboarding: () => set({ onboardingComplete: true }),
    }),
    {
      name: 'invozen-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
