'use client'
import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import dynamic from 'next/dynamic'
import { Sidebar } from './Sidebar'
import { MobileTabBar } from './MobileTabBar'
import { ToastContainer } from '../ui/Toast'
import { useKeySequence } from '@/lib/hooks/useKeyboardShortcut'
import { useRouter } from 'next/navigation'
import { registerTokenGetter } from '@/lib/api/tokenStore'

// Lazily load heavy components
const AIChatPanel = dynamic(() => import('../ai/AIChatPanel').then(m => m.AIChatPanel), {
  ssr: false,
  loading: () => null
})
const CommandPalette = dynamic(() => import('../ui/CommandPalette').then(m => m.CommandPalette), {
  ssr: false
})
const KeyboardShortcutsPanel = dynamic(() => import('../ui/KeyboardShortcutsPanel').then(m => m.KeyboardShortcutsPanel), {
  ssr: false
})

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
