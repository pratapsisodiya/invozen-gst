'use client'
import { Sidebar } from './Sidebar'
import { MobileTabBar } from './MobileTabBar'
import { ToastContainer } from '../ui/Toast'
import { AIChatPanel } from '../ai/AIChatPanel'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-warm)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-14 lg:pb-0">
        {children}
      </div>
      <MobileTabBar />
      <ToastContainer />
      <AIChatPanel />
    </div>
  )
}
