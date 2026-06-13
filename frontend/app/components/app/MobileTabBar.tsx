'use client'
import { useState, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useClerk } from '@clerk/nextjs'
import {
  LayoutDashboard, FileText, Plus, Users, MoreHorizontal,
  BarChart2, CreditCard, Bell, Settings, Stamp, Briefcase, Package,
  ShoppingCart, Store, FileMinus, FilePlus, RefreshCw, ClipboardList,
  GitMerge, TrendingUp, AlertOctagon, ScanLine, GitBranch, FileCheck,
  ShieldCheck, BarChart, Building2, Activity, Download, Landmark,
  BookOpen, Receipt, Truck, Wallet, ArrowUpDown, Sparkles, LogOut,
} from 'lucide-react'

const MORE_ITEMS = [
  { href: '/ai-copilot', icon: Sparkles, label: 'AI Copilot' },
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
  { href: '/ca-dashboard', icon: Building2, label: 'CA Clients' },
  { href: '/audit-log', icon: Activity, label: 'Audit Log' },
  { href: '/accountant', icon: Briefcase, label: 'Accountant' },
  { href: '/backup', icon: Download, label: 'Backup' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/payments', icon: CreditCard, label: 'Payments' },
  { href: '/cash-command', icon: Wallet, label: 'Cash Command' },
  { href: '/payment-optimizer', icon: ArrowUpDown, label: 'Pay Optimizer' },
  { href: '/expenses', icon: Receipt, label: 'Expenses' },
  { href: '/bank-recon', icon: Landmark, label: 'Bank Recon' },
  { href: '/tds', icon: BookOpen, label: 'TDS' },
  { href: '/reminders', icon: Bell, label: 'Reminders' },
  { href: '/items', icon: Package, label: 'Items' },
  { href: '/quotations', icon: ClipboardList, label: 'Quotations' },
  { href: '/recurring', icon: RefreshCw, label: 'Recurring' },
]

function MobileTabBarComponent() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const { signOut } = useClerk()

  const isActive = (href: string) => {
    if (!pathname) return false
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
            <button
              onClick={() => signOut({ redirectUrl: '/' })}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center hover:bg-err-50 cursor-pointer"
              style={{ color: 'var(--err-600)' }}
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] font-medium">Sign out</span>
            </button>
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

export const MobileTabBar = memo(MobileTabBarComponent)
