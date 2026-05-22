'use client'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useItemStore } from '@/lib/store/itemStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { FileText, Users, Package, ShoppingCart, LayoutDashboard, Settings, BarChart2, Search, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CommandResult {
  id: string
  type: 'invoice' | 'customer' | 'item' | 'purchase' | 'page'
  label: string
  sublabel: string
  href: string
  icon: LucideIcon
  badge?: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-ink-100 text-ink-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-ok-100 text-ok-700',
  overdue: 'bg-err-100 text-err-700',
  void: 'bg-ink-100 text-ink-400',
}

const STATIC_PAGES: CommandResult[] = [
  { id: 'p-dashboard', type: 'page', label: 'Dashboard', sublabel: 'Overview & KPIs', href: '/dashboard', icon: LayoutDashboard },
  { id: 'p-invoices', type: 'page', label: 'Invoices', sublabel: 'Manage invoices', href: '/invoices', icon: FileText },
  { id: 'p-customers', type: 'page', label: 'Customers', sublabel: 'Customer management', href: '/customers', icon: Users },
  { id: 'p-items', type: 'page', label: 'Items & Services', sublabel: 'Product catalog', href: '/items', icon: Package },
  { id: 'p-purchases', type: 'page', label: 'Purchases', sublabel: 'Purchase register & ITC', href: '/purchases', icon: ShoppingCart },
  { id: 'p-reports', type: 'page', label: 'GST Reports', sublabel: 'GSTR-1, GSTR-3B, filing', href: '/reports/gstr1', icon: BarChart2 },
  { id: 'p-settings', type: 'page', label: 'Settings', sublabel: 'Business profile & preferences', href: '/settings', icon: Settings },
]

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { invoices } = useInvoiceStore()
  const { customers } = useCustomerStore()
  const { items } = useItemStore()
  const { purchases } = usePurchaseStore()

  const open = useCallback(() => { setIsOpen(true); setQuery(''); setActiveIndex(0) }, [])
  const close = useCallback(() => setIsOpen(false), [])

  useKeyboardShortcut('k', open, { meta: true, preventDefault: true })

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  useEffect(() => { setActiveIndex(0) }, [query])

  const results = useMemo((): CommandResult[] => {
    if (!query.trim()) return STATIC_PAGES
    const q = query.toLowerCase()

    const invoiceResults: CommandResult[] = invoices
      .filter((i) => i.invoiceNumber.toLowerCase().includes(q) || i.customerSnapshot.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((i) => ({ id: i.id, type: 'invoice', label: i.invoiceNumber, sublabel: i.customerSnapshot.name, href: `/invoices/${i.id}`, icon: FileText, badge: i.status }))

    const customerResults: CommandResult[] = customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.gstin?.toLowerCase().includes(q) || c.phone?.includes(q))
      .slice(0, 5)
      .map((c) => ({ id: c.id, type: 'customer', label: c.name, sublabel: c.gstin || c.billingAddress.city, href: `/customers/${c.id}`, icon: Users }))

    const itemResults: CommandResult[] = items
      .filter((i) => i.name.toLowerCase().includes(q) || i.hsnCode?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((i) => ({ id: i.id, type: 'item', label: i.name, sublabel: `HSN: ${i.hsnCode || 'N/A'} · ₹${i.defaultRate.toLocaleString('en-IN')}`, href: `/items/${i.id}/edit`, icon: Package }))

    const purchaseResults: CommandResult[] = purchases
      .filter((p) => p.purchaseNumber.toLowerCase().includes(q) || p.vendorSnapshot.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((p) => ({ id: p.id, type: 'purchase', label: p.purchaseNumber, sublabel: p.vendorSnapshot.name, href: `/purchases/${p.id}`, icon: ShoppingCart }))

    return [...invoiceResults, ...customerResults, ...itemResults, ...purchaseResults].slice(0, 20)
  }, [query, invoices, customers, items, purchases])

  const navigate = useCallback((href: string) => {
    router.push(href)
    close()
  }, [router, close])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter' && results[activeIndex]) { navigate(results[activeIndex].href) }
  }

  if (!isOpen) return null

  const TYPE_LABELS: Record<string, string> = {
    invoice: 'Invoice', customer: 'Customer', item: 'Item', purchase: 'Purchase', page: 'Navigate',
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4">
      <div className="fixed inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'white', border: '1px solid var(--border)' }}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search invoices, customers, items… or type a command"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: 'var(--text)' }}
          />
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--surface)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No results for "{query}"</div>
          ) : (
            results.map((result, i) => {
              const Icon = result.icon
              return (
                <button
                  key={result.id}
                  onClick={() => navigate(result.href)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === activeIndex ? 'bg-brand-50' : 'hover:bg-ink-50'}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${i === activeIndex ? 'bg-brand-100' : 'bg-ink-100'}`}>
                    <Icon className={`w-3.5 h-3.5 ${i === activeIndex ? 'text-brand-600' : ''}`} style={i !== activeIndex ? { color: 'var(--text-muted)' } : {}} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{result.label}</span>
                      {result.badge && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[result.badge] || 'bg-ink-100 text-ink-600'}`}>
                          {result.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{result.sublabel}</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {TYPE_LABELS[result.type]}
                  </span>
                  {i === activeIndex && <ArrowRight className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
                </button>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <kbd className="px-1 py-0.5 rounded border text-[10px] mr-1" style={{ borderColor: 'var(--border)' }}>↑↓</kbd>navigate
            <kbd className="px-1 py-0.5 rounded border text-[10px] mx-1" style={{ borderColor: 'var(--border)' }}>↵</kbd>open
            <kbd className="px-1 py-0.5 rounded border text-[10px] mx-1" style={{ borderColor: 'var(--border)' }}>ESC</kbd>close
          </span>
        </div>
      </div>
    </div>
  )
}
