'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { TopBar } from '../app/TopBar'
import { formatDate } from '@/lib/utils/formatters'
import { CheckCircle2, Bell, AlertTriangle, CreditCard, FileText, MessageCircle, Settings, User, Zap, CheckCheck } from 'lucide-react'
import type { NotificationType } from '@/types/notification'

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string }> = {
  invoice_paid: { icon: <CreditCard className="w-4 h-4" />, color: 'text-ok-600', bg: 'bg-ok-50' },
  invoice_overdue: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-err-600', bg: 'bg-err-50' },
  payment_received: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-ok-600', bg: 'bg-ok-50' },
  reminder_sent: { icon: <MessageCircle className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
  gst_due: { icon: <FileText className="w-4 h-4" />, color: 'text-warn-600', bg: 'bg-warn-50' },
  system: { icon: <Settings className="w-4 h-4" />, color: 'text-ink-500', bg: 'bg-ink-100' },
  accountant: { icon: <User className="w-4 h-4" />, color: 'text-brand-600', bg: 'bg-brand-50' },
  einvoice: { icon: <Zap className="w-4 h-4" />, color: 'text-brand-600', bg: 'bg-brand-50' },
}

const TYPE_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'invoice_paid', label: 'Paid' },
  { key: 'invoice_overdue', label: 'Overdue' },
  { key: 'gst_due', label: 'GST' },
  { key: 'reminder_sent', label: 'Reminders' },
]

export function NotificationsClient() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotificationStore()
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => {
    let result = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (typeFilter !== 'all') result = result.filter((n) => n.type === typeFilter)
    return result
  }, [notifications, typeFilter])

  const handleClick = (id: string) => {
    markRead(id)
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Notifications"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        actions={
          unreadCount > 0 ? (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          ) : null
        }
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        {/* Filters */}
        <div className="rounded-xl bg-white p-4 flex flex-wrap items-center gap-3" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex gap-1 flex-wrap">
            {TYPE_FILTERS.map((f) => (
              <button key={f.key} onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === f.key ? 'bg-brand-600 text-white' : 'hover:bg-ink-50'}`}
                style={{ color: typeFilter === f.key ? undefined : 'var(--text-2)' }}>
                {f.label}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <span className="ml-auto text-[13px] font-medium text-brand-600">
              {unreadCount} unread
            </span>
          )}
        </div>

        {/* Notification list */}
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notifications</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map((notif) => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
                const content = (
                  <div
                    className={`flex items-start gap-4 px-5 py-4 border-t cursor-pointer transition-colors hover:bg-ink-50/50 ${!notif.isRead ? 'bg-brand-50/30' : ''}`}
                    style={{ borderColor: 'var(--border-soft)' }}
                    onClick={() => handleClick(notif.id)}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${!notif.isRead ? 'text-brand-700' : ''}`}
                          style={{ color: notif.isRead ? 'var(--text)' : undefined }}>
                          {notif.title}
                        </p>
                        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-faint)' }}>
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{notif.message}</p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                )

                return notif.linkUrl ? (
                  <Link key={notif.id} href={notif.linkUrl} onClick={() => markRead(notif.id)}>
                    {content}
                  </Link>
                ) : (
                  <div key={notif.id}>{content}</div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
