'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Trash2 } from 'lucide-react'
import { useAIStore } from '@/lib/store/aiStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useBusinessStore } from '@/lib/store/businessStore'

const QUICK_PROMPTS = [
  "What's my tax liability this month?",
  "Which customers haven't paid?",
  "How much ITC can I still claim?",
  "Summarize my outstanding invoices",
]

export function AIChatPanel() {
  const { messages, isOpen, isLoading, addMessage, clearMessages, setOpen, setLoading } = useAIStore()
  const { invoices } = useInvoiceStore()
  const { customers } = useCustomerStore()
  const { getItcSummary } = usePurchaseStore()
  const { profile } = useBusinessStore()

  const [inputValue, setInputValue] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingText])

  function buildContext() {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const thisMonthInvs = invoices.filter((inv) => {
      if (inv.status === 'void' || inv.status === 'draft') return false
      const d = new Date(inv.invoiceDate)
      return d.getMonth() + 1 === month && d.getFullYear() === year
    })
    const revenue = thisMonthInvs.filter((i) => i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0)
    const gstCollected = thisMonthInvs.filter((i) => i.status !== 'draft').reduce((s, i) => s + i.cgstTotal + i.sgstTotal + i.igstTotal, 0)
    const outstanding = invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.balanceDue, 0)
    const sentCount = invoices.filter((i) => i.status === 'sent').length
    const overdueInvs = invoices.filter((i) => i.status === 'overdue')
    const overdue = overdueInvs.reduce((s, i) => s + i.balanceDue, 0)
    const itc = getItcSummary()
    return {
      businessName: profile.businessName,
      gstin: profile.gstin,
      state: profile.state,
      filingFrequency: profile.filingFrequency,
      revenue,
      outstanding,
      overdue,
      overdueCount: overdueInvs.length,
      sentCount,
      gstCollected,
      itcAvailable: itc.available,
      itcClaimed: itc.claimed,
      itcPending: itc.pending,
      totalInvoices: invoices.length,
      totalCustomers: customers.length,
    }
  }

  const handleSend = async (text?: string) => {
    const msg = (text ?? inputValue).trim()
    if (!msg || isLoading) return
    setInputValue('')
    addMessage({ role: 'user', content: msg })
    setLoading(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          context: buildContext(),
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) throw new Error('AI unavailable')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        setStreamingText(buffer)
      }
      addMessage({ role: 'assistant', content: buffer || 'No response received.' })
    } catch {
      addMessage({ role: 'assistant', content: 'AI service is unavailable. Please check your API key configuration.' })
    } finally {
      setLoading(false)
      setStreamingText('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!isOpen)}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-colors"
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
        title="AI Assistant"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-36 right-4 lg:bottom-20 lg:right-6 z-40 w-80 lg:w-96 rounded-2xl flex flex-col transition-all duration-200 ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          background: 'white',
          maxHeight: '520px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Assistant</span>
          </div>
          {messages.length > 0 && (
            <button onClick={clearMessages} title="Clear history" className="p-1 rounded hover:bg-ink-100 transition-colors">
              <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ minHeight: 0 }}>
          {messages.length === 0 && !isLoading && (
            <>
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Ask me anything about your business, GST, or finances.
              </p>
              <div className="flex flex-col gap-1.5 mt-1">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    className="text-left text-xs px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'rounded-bl-sm'
                }`}
                style={msg.role === 'assistant' ? { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' } : {}}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Streaming bubble */}
          {isLoading && (
            <div className="flex justify-start">
              <div
                className="max-w-[85%] px-3 py-2 rounded-xl rounded-bl-sm text-sm"
                style={{ background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
              >
                {streamingText ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{streamingText}<span className="inline-block w-1 h-3.5 bg-brand-500 ml-0.5 animate-pulse rounded-sm" /></p>
                ) : (
                  <span className="flex gap-1 items-center py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about GST, invoices, payments…"
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent text-sm outline-none"
              style={{ color: 'var(--text)', maxHeight: '80px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>Powered by Claude · Enter to send</p>
        </div>
      </div>
    </>
  )
}
