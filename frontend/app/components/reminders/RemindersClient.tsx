'use client'
import { useState, useMemo } from 'react'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import { useUIStore } from '@/lib/store/uiStore'
import { shareInvoiceViaWhatsApp } from '@/lib/whatsapp/whatsappShare'
import { TopBar } from '../app/TopBar'
import { Tabs } from '../ui/Tabs'
import { BulkReminderClient } from './BulkReminderClient'
import { formatDate } from '@/lib/utils/formatters'
import { MessageCircle, Send, Clock, AlertTriangle, CheckCircle2, Settings, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react'

const TEMPLATES = [
  {
    id: 'due_today',
    label: 'Due Today',
    subject: 'Invoice Due Today — Action Required',
    body: `Dear [Customer Name],

This is a friendly reminder that invoice [INV-No] for ₹[Amount] is due today.

Please process the payment at your earliest convenience.

Thank you for your business!

Regards,
[Business Name]`,
  },
  {
    id: 'overdue',
    label: 'Overdue',
    subject: 'Overdue Invoice — Immediate Attention Required',
    body: `Dear [Customer Name],

Invoice [INV-No] for ₹[Amount] was due on [Due Date] and is now overdue.

Please arrange payment immediately to avoid any disruption.

If payment has already been made, please share the transaction reference.

Regards,
[Business Name]`,
  },
  {
    id: 'due_soon',
    label: 'Due in 3 Days',
    subject: 'Invoice [INV-No] — Payment Due in 3 Days',
    body: `Dear [Customer Name],

Just a heads-up that invoice [INV-No] for ₹[Amount] is due on [Due Date] — that's just 3 days away.

Please ensure timely payment to maintain a good credit history.

Thank you!

Regards,
[Business Name]`,
  },
  {
    id: 'reminder_7',
    label: '7 Days After Due',
    subject: 'URGENT: Overdue Invoice [INV-No]',
    body: `Dear [Customer Name],

We haven't received payment for invoice [INV-No] (₹[Amount]) which was due on [Due Date] — now 7 days overdue.

Please contact us immediately or arrange payment to avoid further action.

Regards,
[Business Name]`,
  },
]

type Priority = 'urgent' | 'overdue' | 'due_today' | 'due_soon'

interface PendingReminder {
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  amount: number
  dueDate: string
  priority: Priority
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  urgent: { label: 'Urgent', color: 'text-err-600', bg: 'bg-err-50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  overdue: { label: 'Overdue', color: 'text-err-600', bg: 'bg-err-50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  due_today: { label: 'Due Today', color: 'text-warn-600', bg: 'bg-warn-50', icon: <Clock className="w-3.5 h-3.5" /> },
  due_soon: { label: 'Due Soon', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Clock className="w-3.5 h-3.5" /> },
}

export function RemindersClient() {
  const { invoices } = useInvoiceStore()
  const { customers } = useCustomerStore()
  const { profile } = useBusinessStore()
  const { addToast } = useUIStore()

  const [activeTab, setActiveTab] = useState('pending')
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [templates, setTemplates] = useState(TEMPLATES)
  const [aiDrafting, setAiDrafting] = useState<string | null>(null)
  const [automationRules, setAutomationRules] = useState([
    { id: 'r1', label: '1 day before due date', sublabel: 'Early reminder to customer', enabled: true },
    { id: 'r2', label: 'On due date', sublabel: 'Due today reminder', enabled: true },
    { id: 'r3', label: '3 days after due date', sublabel: 'First overdue follow-up', enabled: true },
    { id: 'r4', label: '7 days after due date', sublabel: 'Urgent overdue notice', enabled: false },
  ])

  const [nowMs] = useState<number>(() => Date.now())
  const today = new Date(nowMs).toISOString().split('T')[0]
  const in3Days = new Date(nowMs + 3 * 86400000).toISOString().split('T')[0]
  const in7Days = new Date(nowMs + 7 * 86400000).toISOString().split('T')[0]

  const pending: PendingReminder[] = useMemo(() => {
    const result: PendingReminder[] = []
    invoices
      .filter((i) => ['sent', 'overdue'].includes(i.status))
      .forEach((inv) => {
        const cust = customers.find((c) => c.id === inv.customerId)
        let priority: Priority
        if (inv.status === 'overdue') {
          const daysPast = Math.floor((nowMs - new Date(inv.dueDate).getTime()) / 86400000)
          priority = daysPast >= 7 ? 'urgent' : 'overdue'
        } else if (inv.dueDate <= today) {
          priority = 'due_today'
        } else {
          priority = 'due_soon'
        }
        result.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerId: inv.customerId,
          customerName: cust?.name || 'Unknown',
          amount: inv.balanceDue,
          dueDate: inv.dueDate,
          priority,
        })
      })
    const order: Priority[] = ['urgent', 'overdue', 'due_today', 'due_soon']
    return result.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority))
  }, [invoices, customers, today])

  const sentLog = useMemo(() => [...sent], [sent])

  const handleSend = (rem: PendingReminder) => {
    const inv = invoices.find((i) => i.id === rem.invoiceId)
    const cust = customers.find((c) => c.id === rem.customerId)
    const phone = cust?.phone?.replace(/\D/g, '') ?? ''
    if (!phone) {
      addToast({ type: 'error', title: 'No phone number for this customer' })
      return
    }
    if (inv) {
      shareInvoiceViaWhatsApp(inv, phone, profile.businessName, '')
    }
    setSent((prev) => new Set([...prev, rem.invoiceId]))
    addToast({ type: 'success', title: 'Reminder sent', message: `WhatsApp opened for ${rem.customerName}` })
  }

  const handleAIDraft = async (rem: PendingReminder) => {
    setAiDrafting(rem.invoiceId)
    try {
      const cust = customers.find((c) => c.id === rem.customerId)
      const phone = cust?.phone?.replace(/\D/g, '') ?? ''
      const daysPast = Math.floor((nowMs - new Date(rem.dueDate).getTime()) / 86400000)
      const res = await fetch('/api/ai/draft-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: rem.customerName,
          invoiceNumber: rem.invoiceNumber,
          amount: rem.amount,
          dueDate: rem.dueDate,
          daysPastDue: Math.max(0, daysPast),
          businessName: profile.businessName,
          previousReminderCount: sent.has(rem.invoiceId) ? 1 : 0,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as { message: string }
      if (phone) {
        const encoded = encodeURIComponent(data.message)
        window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
        setSent((prev) => new Set([...prev, rem.invoiceId]))
      } else {
        addToast({ type: 'info', title: 'AI Reminder', message: 'No phone number — message copied to clipboard' })
        void navigator.clipboard.writeText(data.message)
      }
    } catch {
      addToast({ type: 'error', title: 'AI draft failed', message: 'Sending standard WhatsApp instead' })
      handleSend(rem)
    } finally {
      setAiDrafting(null)
    }
  }

  const handleSendAll = () => {
    const overdueInvs = pending.filter((r) => ['urgent', 'overdue'].includes(r.priority))
    overdueInvs.forEach((r) => {
      const cust = customers.find((c) => c.id === r.customerId)
      const phone = cust?.phone?.replace(/\D/g, '') ?? ''
      const inv = invoices.find((i) => i.id === r.invoiceId)
      if (phone && inv) shareInvoiceViaWhatsApp(inv, phone, profile.businessName, '')
      setSent((prev) => new Set([...prev, r.invoiceId]))
    })
    addToast({ type: 'success', title: `${overdueInvs.length} reminders sent`, message: 'WhatsApp opened for all overdue' })
  }

  const overdueCount = pending.filter((r) => ['urgent', 'overdue'].includes(r.priority)).length

  const tabs = [
    { key: 'pending', label: 'Pending', count: pending.filter((r) => !sent.has(r.invoiceId)).length },
    { key: 'bulk', label: 'Bulk WhatsApp' },
    { key: 'templates', label: 'Templates' },
    { key: 'automation', label: 'Automation' },
    { key: 'sent', label: 'Sent Log', count: sent.size },
  ]

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="WhatsApp Reminders"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          overdueCount > 0 ? (
            <button onClick={handleSendAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              <Send className="w-4 h-4" /> Send All Overdue ({overdueCount})
            </button>
          ) : null
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-5 pt-4 pb-0">
            <Tabs
              tabs={tabs.map((t) => ({ key: t.key, label: t.label, count: t.count }))}
              activeKey={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {/* Pending tab */}
          {activeTab === 'pending' && (
            <div className="p-5">
              {pending.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-ok-500" />
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>All caught up!</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No pending payment reminders</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pending.map((r) => {
                    const config = PRIORITY_CONFIG[r.priority]
                    const isSent = sent.has(r.invoiceId)
                    return (
                      <div key={r.invoiceId}
                        className={`flex items-center gap-4 p-4 rounded-xl border ${isSent ? 'opacity-50' : ''}`}
                        style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold ${config.bg} ${config.color} min-w-[80px] justify-center flex-shrink-0`}>
                          {config.icon}
                          {config.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.customerName}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {r.invoiceNumber} · Due {formatDate(r.dueDate)}
                          </p>
                        </div>
                        <p className="tabular-nums font-semibold text-sm" style={{ color: 'var(--text)' }}>
                          ₹{r.amount.toLocaleString('en-IN')}
                        </p>
                        {isSent ? (
                          <span className="flex items-center gap-1 text-xs text-ok-600 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Sent
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => void handleAIDraft(r)} disabled={aiDrafting === r.invoiceId}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium hover:bg-brand-50 disabled:opacity-50 transition-colors"
                              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                              {aiDrafting === r.invoiceId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-brand-600" />}
                              AI
                            </button>
                            <button onClick={() => handleSend(r)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors">
                              <MessageCircle className="w-3.5 h-3.5" /> Send
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Bulk WhatsApp tab */}
          {activeTab === 'bulk' && (
            <div className="p-5">
              <BulkReminderClient />
            </div>
          )}

          {/* Templates tab */}
          {activeTab === 'templates' && (
            <div className="p-5 flex flex-col gap-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Customize message templates. Use tokens: <code className="px-1 py-0.5 rounded bg-ink-100 text-[11px]">[Customer Name]</code> <code className="px-1 py-0.5 rounded bg-ink-100 text-[11px]">[INV-No]</code> <code className="px-1 py-0.5 rounded bg-ink-100 text-[11px]">[Amount]</code> <code className="px-1 py-0.5 rounded bg-ink-100 text-[11px]">[Due Date]</code> <code className="px-1 py-0.5 rounded bg-ink-100 text-[11px]">[Business Name]</code>
              </p>
              {templates.map((tpl) => (
                <div key={tpl.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => setEditingTemplate(editingTemplate === tpl.id ? null : tpl.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-ink-50 transition-colors text-left"
                    style={{ background: 'var(--surface)' }}>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{tpl.label}</span>
                    {editingTemplate === tpl.id ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  {editingTemplate === tpl.id && (
                    <div className="p-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Subject</label>
                        <input type="text" value={tpl.subject}
                          onChange={(e) => setTemplates((prev) => prev.map((t) => t.id === tpl.id ? { ...t, subject: e.target.value } : t))}
                          className="w-full h-9 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600/20"
                          style={{ borderColor: 'var(--border)' }} />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Message</label>
                        <textarea value={tpl.body} rows={7}
                          onChange={(e) => setTemplates((prev) => prev.map((t) => t.id === tpl.id ? { ...t, body: e.target.value } : t))}
                          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600/20 resize-none font-mono"
                          style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
                      </div>
                      <button
                        onClick={() => { setEditingTemplate(null); addToast({ type: 'success', title: 'Template saved' }) }}
                        className="self-end px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                        Save Template
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Automation tab */}
          {activeTab === 'automation' && (
            <div className="p-5">
              <div className="flex flex-col gap-3">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                    <Settings className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{rule.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rule.sublabel}</p>
                    </div>
                    <div
                      onClick={() => setAutomationRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer transition-colors ${rule.enabled ? 'bg-brand-600' : 'bg-ink-200'}`}
                      role="switch">
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                Automation rules send WhatsApp messages automatically when conditions are met.
              </p>
            </div>
          )}

          {/* Sent log tab */}
          {activeTab === 'sent' && (
            <div className="p-5">
              {sent.size === 0 ? (
                <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No reminders sent yet</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {[...sent].map((invoiceId) => {
                    const inv = invoices.find((i) => i.id === invoiceId)
                    const cust = inv ? customers.find((c) => c.id === inv.customerId) : null
                    return (
                      <div key={invoiceId} className="flex items-center gap-4 p-4 rounded-xl"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                        <CheckCircle2 className="w-5 h-5 text-ok-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{cust?.name || 'Unknown'}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {inv?.invoiceNumber || invoiceId} · Sent just now
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-ok-50 text-ok-600 font-medium">Delivered</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
