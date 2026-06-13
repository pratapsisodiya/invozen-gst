'use client'
import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useClerk } from '@clerk/nextjs'
import {
  LayoutDashboard, FileText, Users, Package, BarChart2, CreditCard,
  Bell, Stamp, Settings, Briefcase, ChevronLeft, ChevronRight,
  ShoppingCart, Store, FileMinus, FilePlus, RefreshCw, ClipboardList,
  Calendar, GitMerge, TrendingUp, Boxes, Activity, BookOpen,
  Receipt, Landmark, Truck, FileCheck, Building2, ClipboardCheck,
  AlertOctagon, ScanLine, GitBranch, ArrowUpDown, Wallet,
  ShieldCheck, BarChart, Download, Sparkles, LogOut,
} from 'lucide-react'
import { useUIStore } from '@/lib/store/uiStore'

const NAV_GROUPS = [
  {
    label: 'AI',
    items: [
      { href: '/ai-copilot', icon: Sparkles, label: 'AI Copilot' },
    ],
  },
  {
    label: 'Core',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/invoices', icon: FileText, label: 'Invoices' },
      { href: '/customers', icon: Users, label: 'Customers' },
      { href: '/items', icon: Package, label: 'Items' },
      { href: '/quotations', icon: ClipboardList, label: 'Quotations' },
      { href: '/recurring', icon: RefreshCw, label: 'Recurring' },
      { href: '/inventory', icon: Boxes, label: 'Inventory' },
      { href: '/challans', icon: Truck, label: 'Challans' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/payments', icon: CreditCard, label: 'Payments' },
      { href: '/cash-command', icon: Wallet, label: 'Cash Command' },
      { href: '/payment-optimizer', icon: ArrowUpDown, label: 'Pay Optimizer' },
      { href: '/expenses', icon: Receipt, label: 'Expenses' },
      { href: '/bank-recon', icon: Landmark, label: 'Bank Recon' },
      { href: '/tds', icon: BookOpen, label: 'TDS' },
      { href: '/reminders', icon: Bell, label: 'Reminders' },
    ],
  },
  {
    label: 'GST & Compliance',
    items: [
      { href: '/reports/gstr1', icon: BarChart2, label: 'GST Reports' },
      { href: '/reports/gstr9', icon: FileText, label: 'GSTR-9 Annual' },
      { href: '/reports/gstr2b', icon: GitMerge, label: 'GSTR-2B Recon' },
      { href: '/reports/financial', icon: TrendingUp, label: 'P&L / Cash Flow' },
      { href: '/gst-notices', icon: AlertOctagon, label: 'GST Notices' },
      { href: '/rcm-detective', icon: ScanLine, label: 'RCM Detective' },
      { href: '/scheme-intelligence', icon: GitBranch, label: 'Scheme Advisor' },
      { href: '/einvoice', icon: Stamp, label: 'E-Invoice' },
      { href: '/purchases', icon: ShoppingCart, label: 'Purchases' },
      { href: '/vendors', icon: Store, label: 'Vendors' },
      { href: '/itc-reconciliation', icon: GitMerge, label: 'ITC Recon' },
      { href: '/filing-workflow', icon: FileCheck, label: 'Filing Workflow' },
      { href: '/credit-notes', icon: FileMinus, label: 'Credit Notes' },
      { href: '/debit-notes', icon: FilePlus, label: 'Debit Notes' },
      { href: '/itc-reversals', icon: FileMinus, label: 'ITC Reversals' },
      { href: '/gstin-verify', icon: ShieldCheck, label: 'GSTIN Verify' },
      { href: '/reports/gst-comparison', icon: BarChart, label: 'GST Comparison' },
    ],
  },
  {
    label: 'Enterprise & CA',
    items: [
      { href: '/ca-dashboard', icon: Building2, label: 'CA Clients' },
      { href: '/audit-log', icon: Activity, label: 'Audit Log' },
      { href: '/accountant', icon: Briefcase, label: 'Accountant' },
      { href: '/backup', icon: Download, label: 'Backup' },
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

function SidebarComponent() {
  const pathname = usePathname()
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const { signOut } = useClerk()

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href.startsWith('/reports')) return pathname.startsWith('/reports')
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'no-print hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 transition-all duration-200',
        sidebarOpen ? 'w-56' : 'w-14'
      )}
      style={{ borderRight: '1px solid var(--border)', background: 'white' }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {sidebarOpen ? (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">G</span>
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>Invozen GST</span>
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center justify-center w-full">
            <span className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold">G</span>
          </Link>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {sidebarOpen && (
              <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1" style={{ color: 'var(--text-faint)' }}>
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors',
                      'hover:bg-ink-50',
                      active && 'bg-brand-50 text-brand-700 font-medium',
                      !sidebarOpen && 'justify-center'
                    )}
                    style={{ color: active ? undefined : 'var(--text-2)' }}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <item.icon className={cn('flex-shrink-0', sidebarOpen ? 'w-4 h-4' : 'w-5 h-5')} />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-2 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => signOut({ redirectUrl: '/' })}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-err-50 cursor-pointer',
            !sidebarOpen && 'justify-center'
          )}
          style={{ color: 'var(--err-600)' }}
          title={!sidebarOpen ? 'Sign out' : undefined}
        >
          <LogOut className={cn('flex-shrink-0', sidebarOpen ? 'w-4 h-4' : 'w-5 h-5')} />
          {sidebarOpen && <span className="font-medium">Sign out</span>}
        </button>

        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full h-8 rounded-lg hover:bg-ink-50 transition-colors"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen
            ? <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            : <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          }
        </button>
      </div>
    </aside>
  )
}

export const Sidebar = memo(SidebarComponent)
