'use client'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { useAuthStore } from '@/lib/store/authStore'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface TopBarProps {
  title: string
  breadcrumb?: { label: string; href?: string }[]
  actions?: React.ReactNode
}

export function TopBar({ title, breadcrumb, actions }: TopBarProps) {
  const { unreadCount } = useNotificationStore()
  const { user, logout } = useAuthStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    setUserMenuOpen(false)
    logout()
    router.push('/login')
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 lg:px-6 flex-shrink-0"
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

      <div className="flex items-center gap-2">
        {actions}
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
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold hover:bg-brand-700 transition-colors"
            aria-label="User menu"
            aria-expanded={userMenuOpen}
          >
            {user?.avatarInitials || 'U'}
          </button>
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div
                className="absolute right-0 top-10 z-20 rounded-xl py-1 min-w-[180px]"
                style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user?.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                </div>
                <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center px-3 py-2 text-sm hover:bg-ink-50 w-full" style={{ color: 'var(--text)' }}>
                  Settings
                </Link>
                <button onClick={handleLogout} className="flex items-center px-3 py-2 text-sm hover:bg-ink-50 w-full text-left text-err-600">
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
