import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/app/components/app/AppShell'
import { AppBootstrap } from '@/app/components/app/AppBootstrap'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/login')
  }

  return (
    <AppBootstrap>
      <AppShell>{children}</AppShell>
    </AppBootstrap>
  )
}
