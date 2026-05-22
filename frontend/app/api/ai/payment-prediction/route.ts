import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { CustomerPaymentProfile, InvoicePaymentPrediction } from '@/types/paymentPrediction'

interface PaymentPredictionRequest {
  profiles: CustomerPaymentProfile[]
  outstandingInvoices: InvoicePaymentPrediction[]
}

interface WeekForecast {
  week: string
  expectedInflow: number
  low: number
  high: number
}

interface AIResult {
  weeklyForecast: WeekForecast[]
  insights: string[]
  alertCustomers: string[]
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: PaymentPredictionRequest
  try {
    body = await req.json() as PaymentPredictionRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (body.outstandingInvoices.length === 0) {
    return Response.json({ weeklyForecast: [], insights: ['No outstanding invoices to forecast.'], alertCustomers: [] } as AIResult)
  }

  const totalOutstanding = body.outstandingInvoices.reduce((s, i) => s + i.amount, 0)
  const profileText = body.profiles
    .slice(0, 10)
    .map((p) => `${p.customerName}: avg ${p.avgDaysToPay}d to pay, ${p.paidWithin30Pct}% within 30d (${p.paidInvoices} paid invoices, confidence: ${p.confidence})`)
    .join('\n')

  const invoiceText = body.outstandingInvoices
    .slice(0, 15)
    .map((i) => `${i.customerName}: ₹${i.amount.toLocaleString('en-IN')} | ${i.daysOverdue}d overdue | prob30: ${i.prob30Days}%`)
    .join('\n')

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are a cash flow forecasting expert for Indian SMBs. Generate a 4-week payment forecast.

Return ONLY valid JSON:
{
  "weeklyForecast": [
    {"week": "Week 1 (today – 7d)", "expectedInflow": number, "low": number, "high": number},
    {"week": "Week 2 (8-14d)", "expectedInflow": number, "low": number, "high": number},
    {"week": "Week 3 (15-21d)", "expectedInflow": number, "low": number, "high": number},
    {"week": "Week 4 (22-30d)", "expectedInflow": number, "low": number, "high": number}
  ],
  "insights": ["insight 1 under 80 chars", "insight 2"],
  "alertCustomers": ["customer name if surprisingly overdue vs history"]
}

Base amounts on payment probabilities. Include 3-4 insights. Be specific about Indian business patterns.`,
        },
        {
          role: 'user',
          content: `Total outstanding: ₹${totalOutstanding.toLocaleString('en-IN')}

Customer profiles:
${profileText}

Outstanding invoices:
${invoiceText}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as AIResult
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/payment-prediction] Error:', err)
    return Response.json({ error: 'Could not generate forecast' }, { status: 503 })
  }
}
