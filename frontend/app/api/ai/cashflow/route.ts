import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { Invoice } from '@/types/invoice'
import type { Payment } from '@/types/payment'

interface CashflowRequest {
  invoices: Invoice[]
  payments: Payment[]
  forecastDays: 30 | 60 | 90
}

interface DayForecast {
  date: string
  expectedInflow: number
  netPosition: number
}

interface CashflowResult {
  prediction: DayForecast[]
  insights: string[]
  atRisk: string[]
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: CashflowRequest
  try {
    body = await req.json() as CashflowRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { invoices, payments, forecastDays } = body

  // Build day-by-day expected inflow from unpaid invoices grouped by due date
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + forecastDays)

  const inflowByDate: Record<string, number> = {}
  const unpaid = invoices.filter((i) => ['sent', 'overdue'].includes(i.status) && i.balanceDue > 0)

  for (const inv of unpaid) {
    const d = inv.dueDate <= today.toISOString().split('T')[0]
      ? today.toISOString().split('T')[0]
      : inv.dueDate
    if (d <= endDate.toISOString().split('T')[0]) {
      inflowByDate[d] = (inflowByDate[d] ?? 0) + inv.balanceDue
    }
  }

  // Payment velocity: average daily collection over last 30 days
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentPayments = payments.filter((p) => p.paymentDate >= thirtyDaysAgo.toISOString().split('T')[0])
  const recentTotal = recentPayments.reduce((s, p) => s + p.amount, 0)
  const dailyVelocity = recentTotal / 30

  // Build prediction array (weekly sampling for chart)
  const prediction: DayForecast[] = []
  let runningBalance = 0
  const stepDays = forecastDays <= 30 ? 3 : forecastDays <= 60 ? 5 : 7

  for (let d = 0; d < forecastDays; d += stepDays) {
    const date = new Date(today)
    date.setDate(date.getDate() + d)
    const dateStr = date.toISOString().split('T')[0]
    const windowInflow = Object.entries(inflowByDate)
      .filter(([k]) => k >= dateStr && k < new Date(date.getTime() + stepDays * 86400000).toISOString().split('T')[0])
      .reduce((s, [, v]) => s + v, 0)
    const expectedInflow = windowInflow + dailyVelocity * stepDays * 0.3
    runningBalance += expectedInflow
    prediction.push({ date: dateStr, expectedInflow: Math.round(expectedInflow), netPosition: Math.round(runningBalance) })
  }

  // Summary stats for AI
  const totalOutstanding = unpaid.reduce((s, i) => s + i.balanceDue, 0)
  const overdueInvoices = unpaid.filter((i) => i.status === 'overdue')
  const totalOverdue = overdueInvoices.reduce((s, i) => s + i.balanceDue, 0)
  const topOverdueNames = overdueInvoices.slice(0, 3).map((i) => `${i.customerSnapshot.name} (₹${i.balanceDue.toLocaleString('en-IN')})`)

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You are a cash flow advisor for Indian SMBs. Analyze cash flow data and identify risks.

Return ONLY valid JSON:
{
  "insights": ["insight 1 under 90 chars", "insight 2", "insight 3"],
  "atRisk": ["invoice/customer at risk 1 under 60 chars", "at risk 2"]
}

insights: 3 actionable insights about cash position, collection velocity, or GST timing.
atRisk: up to 3 invoices or customers most at risk of non-payment (empty array if none).`,
        },
        {
          role: 'user',
          content: `Forecast period: ${forecastDays} days
Total outstanding: ₹${totalOutstanding.toLocaleString('en-IN')} across ${unpaid.length} invoices
Overdue: ₹${totalOverdue.toLocaleString('en-IN')} across ${overdueInvoices.length} invoices
Top overdue: ${topOverdueNames.join(', ') || 'None'}
Recent collection velocity: ₹${Math.round(dailyVelocity).toLocaleString('en-IN')}/day (last 30d avg)
Payments last 30d: ${recentPayments.length} payments totalling ₹${recentTotal.toLocaleString('en-IN')}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    let parsed: { insights: string[]; atRisk: string[] }
    try {
      const p = JSON.parse(raw)
      if (typeof p !== 'object' || p === null || !Array.isArray(p.insights)) throw new Error('Bad shape')
      parsed = p as { insights: string[]; atRisk: string[] }
    } catch (parseErr) {
      console.error('[AI/cashflow] Parse error:', parseErr)
      return Response.json({ error: 'Could not parse AI response' }, { status: 503 })
    }

    return Response.json({ prediction, ...parsed } satisfies CashflowResult)
  } catch (err) {
    console.error('[AI/cashflow] Error:', err)
    return Response.json({ error: 'Could not generate cash flow forecast' }, { status: 503 })
  }
}
