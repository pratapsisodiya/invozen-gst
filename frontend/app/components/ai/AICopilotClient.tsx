'use client'
import { useState, useRef, useEffect } from 'react'
import { TopBar } from '@/app/components/app/TopBar'
import { useApiClient } from '@/lib/api/client'
import { Sparkles, Send, Loader2, BarChart2, FileText, RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react'

type Tab = 'chat' | 'insights' | 'invoice-assistant'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Insight {
  category: string
  title: string
  detail: string
  priority: 'high' | 'medium' | 'low'
}

interface InsightsResult {
  score: number
  insights: Insight[]
  recommendations: string[]
  topCustomers: { name: string; revenue: number }[]
  generatedAt: string
  dataContext: {
    invoiceCount: number
    totalRevenue: number
    outstanding: number
    gstThisMonth: number
    itcAvailable: number
  }
}

interface InvoiceLineItem {
  description: string
  hsn: string
  quantity: number
  unit: string
  rate: number
  gstRate: number
}

interface InvoiceAssistantResult {
  customerHint: string
  lineItems: InvoiceLineItem[]
  notes: string
  totalEstimate: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

const QUICK_PROMPTS = [
  'What is my GST liability this month?',
  'Which invoices are overdue?',
  'How much ITC can I claim?',
  'Give me a summary of my business this month',
  'When should I file GSTR-1?',
]

function priorityColor(p: string) {
  if (p === 'high') return 'text-red-600 bg-red-50 border-red-200'
  if (p === 'medium') return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-emerald-600 bg-emerald-50 border-emerald-200'
}

function priorityIcon(p: string) {
  if (p === 'high') return <AlertTriangle className="w-4 h-4" />
  if (p === 'medium') return <Info className="w-4 h-4" />
  return <CheckCircle className="w-4 h-4" />
}

export function AICopilotClient() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatContext, setChatContext] = useState<Record<string, number> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Insights state
  const [insightsData, setInsightsData] = useState<InsightsResult | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState('')

  // Invoice assistant state
  const [iaInput, setIaInput] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const [iaResult, setIaResult] = useState<InvoiceAssistantResult | null>(null)
  const [iaError, setIaError] = useState('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const { request } = useApiClient()

  async function sendChat(text?: string) {
    const content = (text ?? chatInput).trim()
    if (!content || chatLoading) return
    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const data = await request<{ reply?: string; context?: Record<string, number> }>(`/ai/chat`, {
        method: 'POST',
        body: JSON.stringify({ messages: newMessages }),
      })

      if (data?.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
        if (data.context) setChatContext(data.context)
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not get a response. Please check your API configuration.' }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Is the backend running?' }])
    } finally {
      setChatLoading(false)
    }
  }

  async function sendAgent(text?: string) {
    const content = (text ?? chatInput).trim()
    if (!content || chatLoading) return
    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const data = await request<{ reply?: string }>(`/ai/agent`, {
        method: 'POST',
        body: JSON.stringify({ messages: newMessages }),
      })
      if (data?.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Agent did not return an answer.' }])
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err?.message || 'Network error. Is the backend running?' }])
    } finally {
      setChatLoading(false)
    }
  }

  async function loadInsights() {
    setInsightsLoading(true)
    setInsightsError('')
    try {
      const data = await request<InsightsResult>(`/ai/insights`, { method: 'POST', body: JSON.stringify({}) })
      if (data) setInsightsData(data)
      else setInsightsError('Failed to generate insights.')
    } catch (err: any) {
      setInsightsError(err?.message || 'Network error. Is the backend running?')
    } finally {
      setInsightsLoading(false)
    }
  }

  async function runInvoiceAssistant() {
    if (!iaInput.trim() || iaLoading) return
    setIaLoading(true)
    setIaError('')
    setIaResult(null)
    try {
      const data = await request<InvoiceAssistantResult>(`/ai/invoice-assistant`, { method: 'POST', body: JSON.stringify({ description: iaInput }) })
      if (data?.lineItems) setIaResult(data)
      else setIaError('Could not parse invoice. Try a more specific description.')
    } catch (err: any) {
      setIaError(err?.message || 'Network error. Is the backend running?')
    } finally {
      setIaLoading(false)
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'chat', label: 'Chat', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'insights', label: 'Business Insights', icon: <BarChart2 className="w-4 h-4" /> },
    { key: 'invoice-assistant', label: 'Invoice Assistant', icon: <FileText className="w-4 h-4" /> },
  ]

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title="AI Copilot"
        breadcrumb={[]}
        actions={
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Powered by Groq · Llama 3.3
            </span>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b px-4 gap-1" style={{ borderColor: 'var(--border)', background: 'white' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Context banner */}
            {chatContext && (
              <div className="px-4 py-2 text-xs flex gap-4 flex-wrap" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <span>📄 {chatContext.invoiceCount} invoices</span>
                <span>💰 ₹{(chatContext.totalRevenue || 0).toLocaleString('en-IN')} revenue</span>
                <span>⏳ ₹{(chatContext.outstanding || 0).toLocaleString('en-IN')} outstanding</span>
                <span>🏦 ₹{(chatContext.gstCollected || 0).toLocaleString('en-IN')} GST collected</span>
                <span>👥 {chatContext.customerCount} customers</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg" style={{ color: 'var(--text)' }}>GST AI Assistant</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Ask anything about your GST, invoices, or business finances</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-md">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => sendChat(p)}
                        className="text-left px-3 py-2 rounded-lg text-sm border hover:bg-brand-50 transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-brand-600 text-white rounded-br-sm'
                        : 'rounded-bl-sm'
                    }`}
                    style={m.role === 'assistant' ? { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' } : {}}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2 text-sm" style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--border)', background: 'white' }}>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendChat() } }}
                  placeholder="Ask about GST, invoices, payments..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-warm)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => void sendChat()}
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void sendAgent()}
                    disabled={!chatInput.trim() || chatLoading}
                    title="Use tool-enabled agent"
                    className="px-3 py-2 rounded-lg border bg-white text-sm hover:bg-ink-50 transition-colors disabled:opacity-50"
                  >
                    Agent
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="flex-1 overflow-y-auto p-6">
          {!insightsData && !insightsLoading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <BarChart2 className="w-12 h-12 text-brand-300" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Generate AI-powered insights from your live business data</p>
              <button
                onClick={() => void loadInsights()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Generate Insights
              </button>
            </div>
          )}

          {insightsLoading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyzing your business data...</p>
            </div>
          )}

          {insightsError && (
            <div className="rounded-lg p-4 text-sm text-red-600 bg-red-50 border border-red-200">{insightsError}</div>
          )}

          {insightsData && (
            <div className="flex flex-col gap-6 max-w-3xl">
              {/* Health score + refresh */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${insightsData.score >= 70 ? 'border-emerald-400 text-emerald-600' : insightsData.score >= 40 ? 'border-amber-400 text-amber-600' : 'border-red-400 text-red-600'}`}>
                    {insightsData.score}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>Business Health Score</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Generated {new Date(insightsData.generatedAt).toLocaleTimeString()}</p>
                  </div>
                </div>
                <button onClick={() => void loadInsights()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-ink-50 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Data summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Revenue', value: `₹${insightsData.dataContext.totalRevenue.toLocaleString('en-IN')}` },
                  { label: 'Outstanding', value: `₹${insightsData.dataContext.outstanding.toLocaleString('en-IN')}` },
                  { label: 'GST This Month', value: `₹${insightsData.dataContext.gstThisMonth.toLocaleString('en-IN')}` },
                  { label: 'Available ITC', value: `₹${insightsData.dataContext.itcAvailable.toLocaleString('en-IN')}` },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-lg p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Insights */}
              <div>
                <p className="font-semibold mb-3" style={{ color: 'var(--text)' }}>AI Insights</p>
                <div className="flex flex-col gap-2">
                  {insightsData.insights?.map((insight, i) => (
                    <div key={i} className={`flex gap-3 p-3 rounded-lg border ${priorityColor(insight.priority)}`}>
                      <span className="mt-0.5 flex-shrink-0">{priorityIcon(insight.priority)}</span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{insight.category}</p>
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-xs mt-0.5 opacity-80">{insight.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {insightsData.recommendations?.length > 0 && (
                <div>
                  <p className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <TrendingUp className="w-4 h-4 text-brand-600" /> Recommendations
                  </p>
                  <div className="flex flex-col gap-2">
                    {insightsData.recommendations.map((r, i) => (
                      <div key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                        <span className="font-semibold text-brand-600 flex-shrink-0">{i + 1}.</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top customers */}
              {insightsData.topCustomers?.length > 0 && (
                <div>
                  <p className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Top Customers</p>
                  <div className="flex flex-col gap-1.5">
                    {insightsData.topCustomers.map((c, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.name}</span>
                        <span className="text-sm font-semibold text-brand-600">₹{c.revenue.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Invoice Assistant Tab */}
      {activeTab === 'invoice-assistant' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl flex flex-col gap-5">
            <div>
              <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>Natural Language Invoice Generator</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Describe what you want to bill and AI will generate the line items with HSN codes and GST rates.</p>
            </div>

            <div className="flex flex-col gap-2">
              <textarea
                value={iaInput}
                onChange={(e) => setIaInput(e.target.value)}
                placeholder="e.g. Bill Infosys for 3 months cloud hosting at ₹50,000/month with 18% GST, and 10 hours of React consulting at ₹3000/hr"
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none resize-none"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-warm)' }}
              />
              <button
                onClick={() => void runInvoiceAssistant()}
                disabled={!iaInput.trim() || iaLoading}
                className="self-start flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {iaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {iaLoading ? 'Generating...' : 'Generate Invoice Structure'}
              </button>
            </div>

            {iaError && (
              <div className="rounded-lg p-3 text-sm text-red-600 bg-red-50 border border-red-200">{iaError}</div>
            )}

            {iaResult && (
              <div className="flex flex-col gap-4 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold" style={{ color: 'var(--text)' }}>Generated Invoice Structure</p>
                  {iaResult.customerHint && (
                    <span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                      Customer: {iaResult.customerHint}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate (₹)', 'GST %', 'Amount (₹)'].map((h) => (
                          <th key={h} className="pb-2 pr-3 font-semibold text-xs" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {iaResult.lineItems.map((item, i) => {
                        const amount = item.quantity * item.rate
                        const gstAmt = amount * item.gstRate / 100
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{item.description}</td>
                            <td className="py-2 pr-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>{item.hsn}</td>
                            <td className="py-2 pr-3" style={{ color: 'var(--text-2)' }}>{item.quantity}</td>
                            <td className="py-2 pr-3" style={{ color: 'var(--text-2)' }}>{item.unit}</td>
                            <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{item.rate.toLocaleString('en-IN')}</td>
                            <td className="py-2 pr-3">
                              <span className="px-1.5 py-0.5 rounded text-xs bg-brand-50 text-brand-700">{item.gstRate}%</span>
                            </td>
                            <td className="py-2 font-medium" style={{ color: 'var(--text)' }}>{(amount + gstAmt).toLocaleString('en-IN')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {iaResult.totalEstimate > 0 && (
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Estimated Total (incl. GST)</p>
                      <p className="text-xl font-bold text-brand-700">₹{iaResult.totalEstimate.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )}

                {iaResult.notes && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Notes: {iaResult.notes}</p>
                )}

                <a
                  href="/invoices/new"
                  className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-brand-50 transition-colors text-brand-700 border-brand-200"
                >
                  <FileText className="w-3.5 h-3.5" /> Create Invoice from This
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
