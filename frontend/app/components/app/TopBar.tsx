'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useClerk, useUser } from '@clerk/nextjs'
import { Bell, Keyboard, LogOut } from 'lucide-react'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { useUIStore } from '@/lib/store/uiStore'

interface TopBarProps {
  title: string
  breadcrumb?: { label: string; href?: string }[]
  actions?: React.ReactNode
}

export function TopBar({ title, breadcrumb, actions }: TopBarProps) {
  const { unreadCount } = useNotificationStore()
  const { openShortcutsPanel } = useUIStore()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    setShowUserMenu(false)
    await signOut({ redirectUrl: '/' })
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 lg:px-6 shrink-0 green-scrollbar overflow-x-auto"
      style={{ background: 'white', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-sm">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span style={{ color: 'var(--text-faint)' }}>/</span>}
                {crumb.href
                  ? <Link href={crumb.href} className="hover:text-brand-600 transition-colors" style={{ color: 'var(--text-muted)' }}>{crumb.label}</Link>
                  : <span style={{ color: 'var(--text-muted)' }}>{crumb.label}</span>
                }
              </span>
            ))}
            <span style={{ color: 'var(--text-faint)' }}>/</span>
          </nav>
        )}
        <h1 className="text-base font-semibold truncate" style={{ color: 'var(--text)' }}>{title}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {actions}
        <button
          onClick={openShortcutsPanel}
          className="hidden sm:flex p-2 rounded-lg hover:bg-ink-50 transition-colors"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </button>
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg hover:bg-ink-50 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-err-600 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu((value) => !value)}
            className="p-1 rounded-full hover:bg-ink-50 transition-colors"
            aria-label="Open account menu"
            aria-expanded={showUserMenu}
          >
            {user?.imageUrl || (user as any)?.profileImageUrl ? (
              <img
                src={(user as any).imageUrl ?? (user as any).profileImageUrl}
                alt={user?.firstName ?? 'User'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-[12px] font-medium text-neutral-700">
                {user?.firstName?.[0] ?? user?.primaryEmailAddress?.emailAddress?.[0] ?? 'U'}
              </div>
            )}
          </button>

          {showUserMenu && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-20 cursor-default"
                aria-label="Close account menu"
                onClick={() => setShowUserMenu(false)}
              />
              <div
                className="absolute right-0 top-full mt-2 z-30 min-w-44 rounded-xl border bg-white p-1 shadow-lg"
                style={{ borderColor: 'var(--border)' }}
              >
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left hover:bg-ink-50 transition-colors"
                  style={{ color: 'var(--text)' }}
                >
                  <LogOut className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
