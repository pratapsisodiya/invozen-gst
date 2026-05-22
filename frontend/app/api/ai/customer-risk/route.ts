import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface CustomerRiskRequest {
  customerName: string
  gstin: string | null
  totalInvoiced: number
  totalPaid: number
  overdueAmount: number
  invoiceCount: number
  paidCount: number
  overdueCount: number
  avgDaysToPay: number
  creditLimit: number | null
  memberSince: string
  lastInvoiceDate: string | null
}

export interface CustomerRiskResult {
  score: 'Low' | 'Medium' | 'High' | 'Critical'
  scoreValue: number
  explanation: string
  recommendedCreditLimit: number
  suggestedPaymentTerms: string
  action: string
  keyFactors: string[]
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: CustomerRiskRequest
  try {
    body = await req.json() as CustomerRiskRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const paymentRatio = body.totalInvoiced > 0 ? (body.totalPaid / body.totalInvoiced) * 100 : 0
  const overdueRatio = body.invoiceCount > 0 ? (body.overdueCount / body.invoiceCount) * 100 : 0

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: `You are a credit risk analyst for an Indian B2B business. Analyze customer payment behavior and return a risk assessment.

Risk levels: Low (0-25), Medium (26-50), High (51-75), Critical (76-100)

Scoring factors:
- Payment ratio (paid/invoiced): higher = better
- Average days to pay: lower = better (>60 days is bad)
- Overdue ratio: lower = better
- Overdue amount vs credit limit: higher ratio = worse
- Customer history length: longer = better
- GSTIN registered: registered = lower risk

Return ONLY valid JSON:
{
  "score": "Low"|"Medium"|"High"|"Critical",
  "scoreValue": 0-100,
  "explanation": "2-sentence explanation under 150 chars",
  "recommendedCreditLimit": number in rupees,
  "suggestedPaymentTerms": "e.g. Net 15, Advance 50%, etc.",
  "action": "specific recommended action under 80 chars",
  "keyFactors": ["factor 1", "factor 2", "factor 3"]
}`,
        },
        {
          role: 'user',
          content: `Customer: ${body.customerName}
GSTIN: ${body.gstin || 'Unregistered'}
Total Invoiced: ₹${body.totalInvoiced.toLocaleString('en-IN')}
Total Paid: ₹${body.totalPaid.toLocaleString('en-IN')} (${paymentRatio.toFixed(0)}% payment rate)
Outstanding/Overdue: ₹${body.overdueAmount.toLocaleString('en-IN')}
Invoice count: ${body.invoiceCount} total, ${body.paidCount} paid, ${body.overdueCount} overdue (${overdueRatio.toFixed(0)}% overdue rate)
Average days to pay: ${body.avgDaysToPay} days
Current credit limit: ₹${body.creditLimit?.toLocaleString('en-IN') || 'Not set'}
Member since: ${body.memberSince}
Last invoice: ${body.lastInvoiceDate || 'N/A'}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    let parsed: CustomerRiskResult
    try {
      const p = JSON.parse(raw)
      if (typeof p !== 'object' || p === null || !('score' in p)) throw new Error('Bad shape')
      parsed = p as CustomerRiskResult
    } catch (parseErr) {
      console.error('[AI/customer-risk] Parse error:', parseErr)
      return Response.json({ error: 'Could not parse AI response' }, { status: 503 })
    }
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/customer-risk] Error:', err)
    return Response.json({ error: 'Could not assess risk' }, { status: 503 })
  }
}
