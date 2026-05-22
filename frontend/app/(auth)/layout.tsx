import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-warm)' }}>
      <div className="w-full max-w-[400px]">
        {children}
      </div>
    </div>
  )
}
