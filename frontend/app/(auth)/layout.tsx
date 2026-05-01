'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-warm)' }}>
      <div className="w-full max-w-[400px]">
        {children}
      </div>
    </div>
  )
}
