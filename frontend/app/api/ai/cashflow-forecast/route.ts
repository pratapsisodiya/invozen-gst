import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { CashFlowForecast } from '@/types/cashFlow'

interface CashFlowRequest {
  forecast: CashFlowForecast
  businessContext: { name: string; industry: string }
}

interface AIResult {
  executiveSummary: string
  scenarios: Array<{ name: string; description: string; netImpact: number }>
  recommendations: string[]
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: CashFlowRequest
  try {
    body = await req.json() as CashFlowRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const f = body.forecast
  const criticalText = f.criticalDates.map((c) => `${c.date}: ${c.description}`).join(', ')

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are a cash flow advisor for Indian SMBs. Analyze the 90-day cash flow forecast and provide scenarios.

Return ONLY valid JSON:
{
  "executiveSummary": "2-3 sentence summary of cash position under 200 chars",
  "scenarios": [
    {"name": "scenario name", "description": "what if scenario under 80 chars", "netImpact": rupee amount negative or positive},
    {"name": "...", "description": "...", "netImpact": 0}
  ],
  "recommendations": ["recommendation 1 under 80 chars", "recommendation 2", "recommendation 3"]
}

Include 3 scenarios (base, pessimistic: top customer pays 2 weeks late, optimistic: all pay within 7d). 3 recommendations.`,
        },
        {
          role: 'user',
          content: `Business: ${body.businessContext.name} (${body.businessContext.industry})
Net spendable today: ₹${f.netSpendableToday.toLocaleString('en-IN')}
Expected inflows (90d): ₹${f.totalExpectedInflows.toLocaleString('en-IN')}
Scheduled outflows: ₹${f.totalScheduledOutflows.toLocaleString('en-IN')}
GST payments: ₹${f.totalGSTPeriod.toLocaleString('en-IN')}
Lowest projected balance: ₹${f.lowestBalance.amount.toLocaleString('en-IN')} on ${f.lowestBalance.date}
Critical dates: ${criticalText || 'None'}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as AIResult
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/cashflow-forecast] Error:', err)
    return Response.json({ error: 'Could not generate forecast analysis' }, { status: 503 })
  }
}
