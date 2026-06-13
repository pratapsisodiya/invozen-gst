'use client'
import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Loader2, Copy, Check, MessageCircle, Send } from 'lucide-react'
import { useUIStore } from '@/lib/store/uiStore'
import type { Invoice } from '@/types/invoice'
import type { Customer } from '@/types/customer'
import type { BusinessProfile } from '@/types/business'
import { getDaysOverdue } from '@/lib/utils/formatters'

interface AISmartReminderModalProps {
  open: boolean
  onClose: () => void
  invoice: Invoice
  customer: Customer
  profile: BusinessProfile
  previousReminders?: number
}

export function AISmartReminderModal({
  open,
  onClose,
  invoice,
  customer,
  profile,
  previousReminders = 0
}: AISmartReminderModalProps) {
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const { addToast } = useUIStore()

  useEffect(() => {
    if (open && !draft) {
      void generateDraft()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const generateDraft = async () => {
    setLoading(true)
    try {
      const daysOverdue = getDaysOverdue(invoice.dueDate)
      const res = await fetch('/api/ai/draft-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.balanceDue,
          dueDate: invoice.dueDate,
          daysOverdue,
          previousReminders,
          businessName: profile.businessName
        })
      })
      if (!res.ok) throw new Error('Failed to generate reminder')
      const data = await res.json() as { message: string }
      setDraft(data.message)
    } catch {
      addToast({ type: 'error', title: 'Generation failed', message: 'Could not draft reminder. Try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    addToast({ type: 'success', title: 'Copied to clipboard' })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const phone = customer.phone?.replace(/\D/g, '') || ''
    if (!phone) {
      addToast({ type: 'error', title: 'No phone number for this customer' })
      return
    }
    const msg = encodeURIComponent(draft)
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank')
    onClose()
  }

  const handleEmail = async () => {
    const email = customer.email
    if (!email) {
      addToast({ type: 'error', title: 'No email address for this customer' })
      return
    }
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, customMessage: draft }), // Assuming backend can accept customMessage
      })
      if (!res.ok) throw new Error('Send failed')
      addToast({ type: 'success', title: `Email sent to ${email}` })
      onClose()
    } catch {
      // Fallback to mailto
      window.open(`mailto:${email}?subject=Payment Reminder: ${invoice.invoiceNumber}&body=${encodeURIComponent(draft)}`)
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="AI Smart Reminder" size="md">
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}>
          <MessageCircle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: 'var(--brand-700)' }}>
            This message is context-aware. It adopts a friendly tone for early reminders, and a firm tone for heavily overdue invoices.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Drafted Message</label>
            <button onClick={() => void generateDraft()} disabled={loading} className="text-xs text-brand-600 font-medium hover:underline disabled:opacity-50">
              Regenerate
            </button>
          </div>
          
          <div className="relative">
            <textarea
              className="w-full h-48 px-3 py-2.5 rounded-lg border text-sm resize-none outline-none focus:ring-2 focus:ring-brand-600/20"
              style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={loading}
              placeholder="Generating smart reminder..."
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 px-5 pb-5">
        <button onClick={handleCopy} disabled={!draft || loading}
          className="flex-1 h-10 rounded-lg border text-sm font-medium hover:bg-ink-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
          {copied ? <Check className="w-4 h-4 text-ok-600" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy Text'}
        </button>
        {customer.phone && (
          <button onClick={handleWhatsApp} disabled={!draft || loading}
            className="flex-1 h-10 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
        )}
        {customer.email && (
          <button onClick={handleEmail} disabled={!draft || loading}
            className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            <Send className="w-4 h-4" /> Send Email
          </button>
        )}
      </div>
    </Modal>
  )
}
