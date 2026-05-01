'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { AppShell } from '@/app/components/app/AppShell'
import { seedMockData } from '@/lib/mock/seed'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) seedMockData()
  }, [isAuthenticated])

  if (!isAuthenticated) return null
  return <AppShell>{children}</AppShell>
}
