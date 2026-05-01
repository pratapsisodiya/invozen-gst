import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

interface BusinessContext {
  businessName: string
  gstin: string
  state: string
  filingFrequency: string
  revenue: number
  outstanding: number
  overdue: number
  overdueCount: number
  sentCount: number
  gstCollected: number
  itcAvailable: number
  itcClaimed: number
  itcPending: number
  totalInvoices: number
  totalCustomers: number
}

interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  message: string
  context: BusinessContext
  history: HistoryMessage[]
}

function buildSystemPrompt(ctx: BusinessContext): string {
  return `You are a GST financial assistant for an Indian small business called "${ctx.businessName}" (GSTIN: ${ctx.gstin || 'not registered'}, State: ${ctx.state}, Filing: ${ctx.filingFrequency}).

Current business snapshot:
- Revenue this month: ₹${ctx.revenue.toLocaleString('en-IN')}
- Outstanding receivables: ₹${ctx.outstanding.toLocaleString('en-IN')} (${ctx.sentCount} invoices)
- Overdue: ₹${ctx.overdue.toLocaleString('en-IN')} (${ctx.overdueCount} invoices)
- GST collected (MTD): ₹${ctx.gstCollected.toLocaleString('en-IN')}
- ITC available: ₹${ctx.itcAvailable.toLocaleString('en-IN')}, claimed: ₹${ctx.itcClaimed.toLocaleString('en-IN')}, pending: ₹${ctx.itcPending.toLocaleString('en-IN')}
- Total invoices: ${ctx.totalInvoices} | Total customers: ${ctx.totalCustomers}

You have deep knowledge of Indian GST law, GSTR-1, GSTR-3B, HSN/SAC codes, ITC rules, and GST compliance. Answer concisely using Indian number formatting (₹, lakhs, crores). Keep responses practical and actionable. Only use data from the snapshot above — do not fabricate figures.`
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: ChatRequest
  try {
    body = await req.json() as ChatRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const client = new Anthropic()
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(body.context),
      messages: [
        ...body.history.slice(-10).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: body.message },
      ],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch {
    return Response.json({ error: 'AI service unavailable' }, { status: 503 })
  }
}
