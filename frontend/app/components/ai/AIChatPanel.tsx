'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Trash2, Paperclip, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAIStore } from '@/lib/store/aiStore'
import { useInvoiceStore } from '@/lib/store/invoiceStore'
import { useCustomerStore } from '@/lib/store/customerStore'
import { usePurchaseStore } from '@/lib/store/purchaseStore'
import { useBusinessStore } from '@/lib/store/businessStore'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const QUICK_PROMPTS = [
  "What's my tax liability this month?",
  "Which customers haven't paid?",
  "How much ITC can I still claim?",
  "Summarize my outstanding invoices",
]

interface AttachedFile {
  name: string
  content: string
  type: 'csv' | 'xlsx' | 'text'
}

export function AIChatPanel() {
  const { messages, isOpen, isLoading, addMessage, clearMessages, setOpen, setLoading } = useAIStore()
  const { invoices } = useInvoiceStore()
  const { customers } = useCustomerStore()
  const { getItcSummary } = usePurchaseStore()
  const { profile } = useBusinessStore()

  const [inputValue, setInputValue] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dragging state
  const [position, setPosition] = useState({ bottom: 80, right: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, startBottom: 0, startRight: 0, hasMoved: false })

  useEffect(() => {
    const isMobile = window.innerWidth < 1024
    setPosition({
      bottom: isMobile ? 80 : 24,
      right: isMobile ? 16 : 24
    })
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startBottom: position.bottom,
      startRight: position.right,
      hasMoved: false
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return
    const deltaX = e.clientX - dragRef.current.startX
    const deltaY = e.clientY - dragRef.current.startY
    
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      dragRef.current.hasMoved = true
      setIsDragging(true)
      
      // Clamp values to keep button on screen
      const newBottom = Math.max(10, Math.min(window.innerHeight - 60, dragRef.current.startBottom - deltaY))
      const newRight = Math.max(10, Math.min(window.innerWidth - 60, dragRef.current.startRight - deltaX))
      
      setPosition({ bottom: newBottom, right: newRight })
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    setTimeout(() => setIsDragging(false), 50)
  }

  const handleToggle = () => {
    if (!dragRef.current.hasMoved) {
      setOpen(!isOpen)
    }
  }

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
    let msg = (text ?? inputValue).trim()
    if ((!msg && attachedFiles.length === 0) || isLoading) return

    // Append file content to the message if files are attached
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles.map(f => `[File: ${f.name}]\n${f.content}`).join('\n\n')
      msg = msg ? `${msg}\n\nAttached File Content:\n${fileContext}` : `Attached File Content:\n${fileContext}`
    }

    setInputValue('')
    setAttachedFiles([])
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

  const parseFile = useCallback(async (file: File) => {
    setIsParsing(true)
    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      
      if (extension === 'csv') {
        Papa.parse(file, {
          complete: (results) => {
            const content = JSON.stringify(results.data.slice(0, 100), null, 2) // Limit to 100 rows
            setAttachedFiles(prev => [...prev, { name: file.name, content, type: 'csv' }])
            setIsParsing(false)
          },
          header: true,
          skipEmptyLines: true,
        })
      } else if (extension === 'xlsx' || extension === 'xls') {
        const reader = new FileReader()
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const json = XLSX.utils.sheet_to_json(worksheet).slice(0, 100) // Limit to 100 rows
          setAttachedFiles(prev => [...prev, { name: file.name, content: JSON.stringify(json, null, 2), type: 'xlsx' }])
          setIsParsing(false)
        }
        reader.readAsArrayBuffer(file)
      } else {
        const text = await file.text()
        setAttachedFiles(prev => [...prev, { name: file.name, content: text.slice(0, 10000), type: 'text' }])
        setIsParsing(false)
      }
    } catch (error) {
      console.error('Error parsing file:', error)
      setIsParsing(false)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <>
      {/* Floating button */}
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleToggle}
        className={cn(
          "fixed z-50 w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-colors shadow-lg touch-none",
          isDragging ? "cursor-grabbing scale-110" : "cursor-grab"
        )}
        style={{ 
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          bottom: `${position.bottom}px`,
          right: `${position.right}px`
        }}
        title="AI Assistant (Drag to move)"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed z-50 w-80 lg:w-96 rounded-2xl flex flex-col transition-all duration-200 ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          background: 'white',
          maxHeight: '560px',
          bottom: `${position.bottom + 60}px`,
          right: `${position.right}px`
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
                Ask me anything about your business, GST, or finances. Upload CSV/Excel to analyze data.
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
          {/* File previews */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-ink-50 border border-ink-100 text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
                  <FileText className="w-3 h-3 text-brand-600" />
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <button onClick={() => removeFile(idx)} className="p-0.5 hover:bg-ink-200 rounded-full transition-colors">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 rounded-xl px-2 py-2" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isParsing}
              className="p-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors flex-shrink-0 disabled:opacity-40 cursor-pointer shadow-md flex items-center justify-center"
              title="Attach file"
              type="button"
            >
              {isParsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
            />
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask or paste data here…"
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent text-sm outline-none py-1"
              style={{ color: 'var(--text)', maxHeight: '100px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={(!inputValue.trim() && attachedFiles.length === 0) || isLoading || isParsing}
              className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>CSV, Excel & Text support · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  )
}
