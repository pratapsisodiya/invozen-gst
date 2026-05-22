'use client'
import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Sidebar } from './Sidebar'
import { MobileTabBar } from './MobileTabBar'
import { ToastContainer } from '../ui/Toast'
import { AIChatPanel } from '../ai/AIChatPanel'
import { CommandPalette } from '../ui/CommandPalette'
import { KeyboardShortcutsPanel } from '../ui/KeyboardShortcutsPanel'
import { useKeySequence } from '@/lib/hooks/useKeyboardShortcut'
import { useRouter } from 'next/navigation'
import { registerTokenGetter } from '@/lib/api/tokenStore'

function GlobalKeySequences() {
  const router = useRouter()
  useKeySequence(['g', 'd'], () => router.push('/dashboard'))
  useKeySequence(['g', 'i'], () => router.push('/invoices'))
  useKeySequence(['g', 'c'], () => router.push('/customers'))
  return null
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  useEffect(() => { registerTokenGetter(getToken) }, [getToken])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-warm)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-14 lg:pb-0">
        {children}
      </div>
      <MobileTabBar />
      <ToastContainer />
      <AIChatPanel />
      <CommandPalette />
      <KeyboardShortcutsPanel />
      <GlobalKeySequences />
    </div>
  )
}
