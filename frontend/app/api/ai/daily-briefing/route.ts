import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

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
}

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
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
      const items = Array.isArray(parsed?.items) ? parsed.items.slice(0, 5) : []
      return Response.json({ items })
    } catch {
      return Response.json({ error: 'Could not parse AI response' }, { status: 503 })
    }
  } catch (err) {
    console.error('[AI/daily-briefing] Error:', err)
    return Response.json({ error: 'Could not generate briefing' }, { status: 503 })
  }
}
