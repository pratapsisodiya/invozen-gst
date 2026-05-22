import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface HealthReportRequest {
  businessName: string
  period: string
  revenue: { current: number; previous: number }
  gstLiability: number
  itcUtilizationPct: number
  overdueRatio: number
  collectionEfficiency: number
  topCustomers: Array<{ name: string; revenue: number }>
  expenseBreakdown: Array<{ category: string; amount: number }>
  invoiceStats: { total: number; paid: number; overdue: number; draft: number }
  filingCompliance: { onTime: number; late: number; pending: number }
}

export interface HealthReportResult {
  overallStatus: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical'
  healthScore: number
  summary: string
  risks: Array<{ title: string; description: string; severity: 'high' | 'medium' | 'low' }>
  opportunities: Array<{ title: string; description: string; impact: string }>
  actionItems: Array<{ task: string; deadline: string; priority: 'immediate' | 'this_week' | 'this_month' }>
  insights: string[]
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: HealthReportRequest
  try {
    body = await req.json() as HealthReportRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const revenueGrowth = body.revenue.previous > 0
    ? (((body.revenue.current - body.revenue.previous) / body.revenue.previous) * 100).toFixed(1)
    : 'N/A'

  const topCustomerText = body.topCustomers.slice(0, 5)
    .map((c) => `${c.name}: ₹${c.revenue.toLocaleString('en-IN')}`)
    .join(', ')

  const expenseText = body.expenseBreakdown.slice(0, 6)
    .map((e) => `${e.category}: ₹${e.amount.toLocaleString('en-IN')}`)
    .join(', ')

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: `You are a senior financial advisor specializing in Indian SME businesses and GST compliance. Generate a comprehensive business health report.

Return ONLY valid JSON:
{
  "overallStatus": "Excellent"|"Good"|"Needs Attention"|"Critical",
  "healthScore": 0-100,
  "summary": "2-3 sentence executive summary",
  "risks": [
    {"title": "risk title", "description": "specific risk under 100 chars", "severity": "high"|"medium"|"low"}
  ],
  "opportunities": [
    {"title": "opportunity title", "description": "specific opportunity under 100 chars", "impact": "estimated impact under 60 chars"}
  ],
  "actionItems": [
    {"task": "specific action under 80 chars", "deadline": "timeframe", "priority": "immediate"|"this_week"|"this_month"}
  ],
  "insights": ["insight 1", "insight 2", "insight 3"]
}

Include 3 risks, 3 opportunities, 5 action items, 4 insights. Be specific with Indian business context and GST compliance.`,
        },
        {
          role: 'user',
          content: `Business: ${body.businessName} | Period: ${body.period}

Financial Metrics:
- Revenue this period: ₹${body.revenue.current.toLocaleString('en-IN')} (${revenueGrowth}% vs last period)
- GST liability: ₹${body.gstLiability.toLocaleString('en-IN')}
- ITC utilization: ${body.itcUtilizationPct.toFixed(1)}%
- Collection efficiency: ${body.collectionEfficiency.toFixed(1)}%
- Overdue ratio: ${body.overdueRatio.toFixed(1)}% of receivables

Invoice Stats: ${body.invoiceStats.total} total | ${body.invoiceStats.paid} paid | ${body.invoiceStats.overdue} overdue | ${body.invoiceStats.draft} draft

Filing Compliance: ${body.filingCompliance.onTime} on-time | ${body.filingCompliance.late} late | ${body.filingCompliance.pending} pending

Top Customers: ${topCustomerText || 'N/A'}
Expense Breakdown: ${expenseText || 'N/A'}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as HealthReportResult
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/health-report] Error:', err)
    return Response.json({ error: 'Could not generate health report' }, { status: 503 })
  }
}
