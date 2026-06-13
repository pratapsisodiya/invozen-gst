import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { AgentActionType } from '@/types/agentAction'

interface BriefingRequest {
  businessName: string
  gstin: string
  state: string
  revenue: number
  outstanding: number
  overdue: number
  overdueCount: number
  gstCollected: number
  itcAvailable: number
  itcPending: number
  netPayable: number
  totalInvoices: number
  totalCustomers: number
  nextFilingDate: string | null
  recentInvoiceCount: number
  todayDate: string
}

export interface BriefingItem {
  type: 'urgent' | 'action' | 'insight' | 'tip'
  title: string
  detail: string
  icon: 'alert' | 'money' | 'tax' | 'chart' | 'check'
  actionType?: AgentActionType
  targetHref?: string
  primaryActionLabel?: string
}

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function enrichBriefingItem(item: BriefingItem): BriefingItem {
  const text = `${item.title} ${item.detail}`.toLowerCase()

  if (text.includes('overdue') || text.includes('collect') || text.includes('reminder')) {
    return { ...item, actionType: 'overdue_followup', targetHref: '/reminders', primaryActionLabel: 'Open reminders' }
  }
  if (text.includes('itc') || text.includes('credit')) {
    return { ...item, actionType: 'itc_claim', targetHref: '/itc-reconciliation', primaryActionLabel: 'Review ITC' }
  }
  if (text.includes('filing') || text.includes('gstr') || text.includes('return')) {
    return { ...item, actionType: 'filing_task', targetHref: '/filing-workflow', primaryActionLabel: 'Open filing workflow' }
  }
  if (text.includes('cash') || text.includes('bank') || text.includes('payable')) {
    return { ...item, actionType: 'cash_warning', targetHref: '/cash-command', primaryActionLabel: 'Open cash command' }
  }
  if (text.includes('rcm') || text.includes('vendor') || text.includes('supplier')) {
    return { ...item, actionType: 'vendor_risk', targetHref: '/action-desk', primaryActionLabel: 'Review action desk' }
  }
  return { ...item, actionType: 'manual_task', targetHref: '/action-desk', primaryActionLabel: 'View action desk' }
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: BriefingRequest
  try {
    body = await req.json() as BriefingRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const summary = `Business: ${body.businessName} (${body.gstin || 'Unregistered'}, ${body.state})
Date: ${body.todayDate}
Revenue MTD: ₹${body.revenue.toLocaleString('en-IN')}
Outstanding receivables: ₹${body.outstanding.toLocaleString('en-IN')}
Overdue (${body.overdueCount} invoices): ₹${body.overdue.toLocaleString('en-IN')}
GST collected MTD: ₹${body.gstCollected.toLocaleString('en-IN')}
ITC available: ₹${body.itcAvailable.toLocaleString('en-IN')}, pending claim: ₹${body.itcPending.toLocaleString('en-IN')}
Net GST payable: ₹${body.netPayable.toLocaleString('en-IN')}
Total invoices: ${body.totalInvoices} | Total customers: ${body.totalCustomers}
Next GST filing due: ${body.nextFilingDate || 'unknown'}
Invoices raised today: ${body.recentInvoiceCount}`

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are a proactive Indian GST business assistant. Generate a personalized daily business briefing with 3-5 actionable items.

Each item must have:
- type: "urgent" (needs immediate action), "action" (do today), "insight" (interesting trend), or "tip" (save time/money)
- title: max 8 words, action-oriented
- detail: max 20 words, specific and numeric
- icon: one of "alert", "money", "tax", "chart", "check"

Rules:
- If overdue > 0, always include an "urgent" item about collecting payments
- If itcPending > 5000, include "action" to claim ITC before 180-day deadline
- If netPayable > 10000, include a tax planning tip
- If nextFilingDate is within 7 days, include "urgent" filing reminder
- Use Indian currency format (₹, lakhs notation)
- Be specific with numbers from the context — never fabricate

Return ONLY valid JSON: {"items": [{"type":"...", "title":"...", "detail":"...", "icon":"..."}]}`
        },
        { role: 'user', content: summary },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    try {
      const parsed = JSON.parse(raw) as { items: BriefingItem[] }
      const items = Array.isArray(parsed?.items) ? parsed.items.slice(0, 5).map(enrichBriefingItem) : []
      return Response.json({ items })
    } catch {
      return Response.json({ error: 'Could not parse AI response' }, { status: 503 })
    }
  } catch (err) {
    console.error('[AI/daily-briefing] Error:', err)
    return Response.json({ error: 'Could not generate briefing' }, { status: 503 })
  }
}
