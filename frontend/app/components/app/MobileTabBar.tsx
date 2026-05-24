'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { LayoutDashboard, FileText, Plus, Users, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import {
  BarChart2, CreditCard, Bell, Settings, Stamp, Briefcase, Package,
  ShoppingCart, Store, FileMinus, FilePlus, RefreshCw, ClipboardList,
} from 'lucide-react'

const MORE_ITEMS = [
  { href: '/reports/gstr1', icon: BarChart2, label: 'GST Reports' },
  { href: '/payments', icon: CreditCard, label: 'Payments' },
  { href: '/reminders', icon: Bell, label: 'Reminders' },
  { href: '/einvoice', icon: Stamp, label: 'E-Invoice' },
  { href: '/items', icon: Package, label: 'Items' },
  { href: '/quotations', icon: ClipboardList, label: 'Quotations' },
  { href: '/recurring', icon: RefreshCw, label: 'Recurring' },
  { href: '/purchases', icon: ShoppingCart, label: 'Purchases' },
  { href: '/vendors', icon: Store, label: 'Vendors' },
  { href: '/credit-notes', icon: FileMinus, label: 'Credit Notes' },
  { href: '/debit-notes', icon: FilePlus, label: 'Debit Notes' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/accountant', icon: Briefcase, label: 'Accountant' },
]

export function MobileTabBar() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMoreOpen(false)} />
      )}

      {/* More sheet */}
      {moreOpen && (
        <div
          className="fixed bottom-16 left-0 right-0 z-50 lg:hidden rounded-t-2xl overflow-y-auto"
          style={{ background: 'white', boxShadow: 'var(--shadow-xl)', borderTop: '1px solid var(--border)', maxHeight: '60vh' }}
        >
          <div className="px-4 py-3 grid grid-cols-4 gap-2">
            {MORE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl text-center',
                  isActive(item.href) ? 'bg-brand-50 text-brand-700' : 'hover:bg-ink-50'
                )}
                style={{ color: isActive(item.href) ? undefined : 'var(--text-2)' }}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
          <div className="h-safe-bottom" />
        </div>
      )}

      {/* Tab bar */}
      <nav
        className="no-print fixed bottom-0 left-0 right-0 z-40 flex items-center lg:hidden"
        style={{ background: 'white', borderTop: '1px solid var(--border)', boxShadow: '0 -1px 8px rgba(0,0,0,0.08)', height: '56px' }}
        aria-label="Mobile navigation"
      >
        {[
          { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { href: '/invoices', icon: FileText, label: 'Invoices' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors',
              isActive(item.href) ? 'text-brand-700' : ''
            )}
            style={{ color: isActive(item.href) ? undefined : 'var(--text-muted)' }}
            aria-label={item.label}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}

        {/* Center + button */}
        <div className="flex-1 flex items-center justify-center">
          <Link
            href="/invoices/new"
            className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center shadow-lg"
            aria-label="New Invoice"
          >
            <Plus className="w-5 h-5 text-white" />
          </Link>
        </div>

        <Link
          href="/customers"
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 h-full',
            isActive('/customers') ? 'text-brand-700' : ''
          )}
          style={{ color: isActive('/customers') ? undefined : 'var(--text-muted)' }}
          aria-label="Customers"
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Customers</span>
        </Link>

        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
          style={{ color: 'var(--text-muted)' }}
          aria-label="More options"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  )
}
