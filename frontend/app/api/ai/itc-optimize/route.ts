import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface ITCOptimizeRequest {
  purchases: Array<{
    vendorName: string
    vendorGstin: string | null
    invoiceDate: string
    taxableValue: number
    igst: number
    cgst: number
    sgst: number
    itcStatus: string
    category?: string
  }>
  itcSummary: {
    available: number
    claimed: number
    pending: number
    reversed: number
  }
  currentMonth: string
  currentFY: string
}

export interface ITCRecommendation {
  type: 'claim' | 'reverse' | 'risk' | 'opportunity'
  title: string
  description: string
  estimatedAmount: number
  priority: 'high' | 'medium' | 'low'
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: ITCOptimizeRequest
  try {
    body = await req.json() as ITCOptimizeRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const purchaseSummary = body.purchases.slice(0, 25).map((p) =>
    `${p.vendorName} | GSTIN: ${p.vendorGstin || 'MISSING'} | Date: ${p.invoiceDate} | Taxable: ₹${p.taxableValue} | Tax: ₹${(p.igst + p.cgst + p.sgst).toFixed(2)} | ITC Status: ${p.itcStatus}`
  ).join('\n')

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: `You are an Indian GST ITC (Input Tax Credit) optimization expert. Analyze purchase data and provide actionable ITC recommendations.

ITC Rules to apply:
- ITC on eligible business purchases can be claimed
- BLOCKED categories: motor vehicles (personal use), food & beverages, club memberships, beauty/health treatments, works contract for immovable property
- ITC must be claimed by November 30 of next financial year (use it or lose it)
- ITC available only if vendor has filed GSTR-1 (indicated by valid GSTIN)
- Purchases without vendor GSTIN cannot claim ITC
- ITC reversal needed if payment not made to vendor within 180 days

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "type": "claim" | "reverse" | "risk" | "opportunity",
      "title": "short title under 60 chars",
      "description": "specific actionable description under 120 chars",
      "estimatedAmount": 0,
      "priority": "high" | "medium" | "low"
    }
  ],
  "totalClaimable": 0,
  "totalAtRisk": 0
}`,
        },
        {
          role: 'user',
          content: `Period: ${body.currentMonth} | FY: ${body.currentFY}
ITC Summary: Available ₹${body.itcSummary.available}, Claimed ₹${body.itcSummary.claimed}, Pending ₹${body.itcSummary.pending}, Reversed ₹${body.itcSummary.reversed}

Purchase Register (${body.purchases.length} total, showing first 25):
${purchaseSummary || 'No purchases'}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as { recommendations: ITCRecommendation[]; totalClaimable: number; totalAtRisk: number }
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/itc-optimize] Error:', err)
    return Response.json({ error: 'Could not analyze ITC' }, { status: 503 })
  }
}
