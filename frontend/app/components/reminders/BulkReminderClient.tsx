'use client'
import { useState, useMemo } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useReminderHistoryStore } from '@/lib/store/reminderHistoryStore'
import { useUIStore } from '@/lib/store/uiStore'
import { buildBulkReminderQueue, openWhatsApp } from '@/lib/whatsapp/whatsappShare'
import { generateId } from '@/lib/utils/ids'
import { formatDate } from '@/lib/utils/formatters'
import { MessageCircle, CheckCircle2, Send, Users, AlertTriangle } from 'lucide-react'

type OverdueBucket = 'all' | '1-15' | '16-30' | '31-60' | '60+'

export function BulkReminderClient() {
  const { invoices } = useInvoiceStore()
  const { customers } = useCustomerStore()
  const { profile, settings } = useBusinessStore()
  const { addRecord, getReminderCountForInvoice } = useReminderHistoryStore()
  const { addToast } = useUIStore()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bucket, setBucket] = useState<OverdueBucket>('all')
  const [showQueue, setShowQueue] = useState(false)
  const [sentSet, setSentSet] = useState<Set<string>>(new Set())

  const today = new Date().toISOString().split('T')[0]

  const overdueInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (inv.status === 'void' || inv.status === 'draft' || inv.status === 'paid') return false
        return inv.dueDate < today && inv.balanceDue > 0
      })
      .map((inv) => {
        const customer = customers.find((c) => c.id === inv.customerId)
        const daysOverdue = Math.floor((new Date(today).getTime() - new Date(inv.dueDate).getTime()) / 86400000)
        return { inv, customer, daysOverdue }
      })
      .filter(({ customer }) => customer)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
  }, [invoices, customers, today])

  const filtered = useMemo(() => {
    if (bucket === 'all') return overdueInvoices
    return overdueInvoices.filter(({ daysOverdue }) => {
      if (bucket === '1-15') return daysOverdue >= 1 && daysOverdue <= 15
      if (bucket === '16-30') return daysOverdue >= 16 && daysOverdue <= 30
      if (bucket === '31-60') return daysOverdue >= 31 && daysOverdue <= 60
      if (bucket === '60+') return daysOverdue > 60
      return true
    })
  }, [overdueInvoices, bucket])

  const toggleSelect = (id: string) => setSelected((s) => {
    const next = new Set(s)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const selectAll = () => setSelected(new Set(filtered.map(({ inv }) => inv.id)))
  const clearAll = () => setSelected(new Set())

  const selectedItems = filtered.filter(({ inv }) => selected.has(inv.id))
  const totalSelected = selectedItems.length
  const totalAmount = selectedItems.reduce((s, { inv }) => s + inv.balanceDue, 0)

  const queue = useMemo(() => {
    if (!showQueue) return []
    return buildBulkReminderQueue(
      selectedItems.map(({ inv, customer, daysOverdue }) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: customer!.name,
        phone: customer!.phone || '',
        amount: inv.balanceDue,
        daysOverdue,
        dueDate: inv.dueDate,
      })),
      profile.businessName,
      settings.bankDetails?.upiId
    )
  }, [selectedItems, showQueue, settings])

  const handleSendOne = (idx: number) => {
    const item = queue[idx]
    if (!item.phone) { addToast({ type: 'error', title: 'No phone number for this customer' }); return }
    openWhatsApp(item.phone, item.message)
    addRecord({
      id: generateId(),
      invoiceId: item.invoiceId,
      invoiceNumber: item.invoiceNumber,
      customerId: selectedItems[idx].inv.customerId,
      customerName: item.customerName,
      phone: item.phone,
      sentAt: new Date().toISOString(),
      amount: item.amount,
      daysOverdue: item.daysOverdue,
      channel: 'whatsapp',
    })
    setSentSet((s) => new Set([...s, item.invoiceId]))
  }

  const handleSendAll = () => {
    let opened = 0
    queue.forEach((item, idx) => {
      if (item.phone && !sentSet.has(item.invoiceId)) {
        setTimeout(() => handleSendOne(idx), idx * 800)
        opened++
      }
    })
    addToast({ type: 'info', title: `Opening ${opened} WhatsApp chats...`, message: 'Allow pop-ups if blocked by browser' })
  }

  if (showQueue) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Send Queue — {queue.length} reminders</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click &quot;Send&quot; to open WhatsApp for each customer</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSendAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium">
              <Send className="w-4 h-4" /> Send All
            </button>
            <button onClick={() => { setShowQueue(false); setSentSet(new Set()) }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
              Back
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {queue.map((item, idx) => (
            <div key={item.invoiceId} className={`rounded-xl p-3 flex items-center gap-3 ${sentSet.has(item.invoiceId) ? 'opacity-60' : ''}`}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.customerName}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.daysOverdue > 60 ? 'bg-err-50 text-err-600' : item.daysOverdue > 30 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    {item.daysOverdue}d overdue
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.invoiceNumber} · ₹{item.amount.toLocaleString('en-IN')} · {item.phone || 'No phone'}</p>
              </div>
              {sentSet.has(item.invoiceId)
                ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                : (
                  <button onClick={() => handleSendOne(idx)} disabled={!item.phone}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50 flex-shrink-0">
                    <MessageCircle className="w-3.5 h-3.5" /> Send
                  </button>
                )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Overdue', value: overdueInvoices.length },
          { label: 'Selected', value: totalSelected },
          { label: 'Outstanding', value: `₹${totalAmount.toLocaleString('en-IN')}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-lg font-bold text-brand-700">{value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filters & actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {(['all', '1-15', '16-30', '31-60', '60+'] as OverdueBucket[]).map((b) => (
            <button key={b} onClick={() => { setBucket(b); setSelected(new Set()) }}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${bucket === b ? 'bg-brand-600 text-white' : 'hover:bg-ink-50'}`}
              style={bucket !== b ? { color: 'var(--text)' } : {}}>
              {b === 'all' ? 'All' : `${b}d`}
            </button>
          ))}
        </div>
        <button onClick={selectAll} className="text-xs text-brand-600 font-semibold hover:text-brand-700">Select All ({filtered.length})</button>
        {selected.size > 0 && <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>}
        {totalSelected > 0 && (
          <button onClick={() => setShowQueue(true)}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium">
            <MessageCircle className="w-4 h-4" /> Send Reminders ({totalSelected})
          </button>
        )}
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Users className="w-8 h-8" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No overdue invoices in this range</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map(({ inv, customer, daysOverdue }) => {
            const isSelected = selected.has(inv.id)
            const reminderCount = getReminderCountForInvoice(inv.id)
            const hasPhone = !!(customer?.phone)
            return (
              <div key={inv.id} onClick={() => toggleSelect(inv.id)}
                className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-brand-600 bg-brand-50' : 'hover:bg-ink-50'}`}
                style={{ border: `1px solid ${isSelected ? 'var(--brand-600)' : 'var(--border)'}` }}>
                <input type="checkbox" checked={isSelected} onChange={() => {}} className="w-4 h-4 rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{customer?.businessName || customer?.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${daysOverdue > 60 ? 'bg-err-50 text-err-600' : daysOverdue > 30 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                      {daysOverdue}d overdue
                    </span>
                    {reminderCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Reminded {reminderCount}×</span>
                    )}
                    {!hasPhone && <span className="text-xs text-amber-600 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />No phone</span>}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {inv.invoiceNumber} · ₹{inv.balanceDue.toLocaleString('en-IN')} · Due {formatDate(inv.dueDate)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
