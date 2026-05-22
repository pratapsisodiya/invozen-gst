import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { VendorReliabilityScore } from '@/lib/gst/vendorReliability'

interface VendorReliabilityRequest {
  vendors: VendorReliabilityScore[]
  totalITCAtRisk: number
}

interface AIRecommendation {
  vendorName: string
  risk: string
  suggestion: string
  itcAmount: number
}

interface AIResult {
  recommendations: AIRecommendation[]
  summary: string
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: VendorReliabilityRequest
  try {
    body = await req.json() as VendorReliabilityRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const riskyVendors = body.vendors.filter((v) => v.reliabilityTier === 'risky' || v.reliabilityTier === 'caution')
  if (riskyVendors.length === 0) {
    return Response.json({
      recommendations: [],
      summary: 'All your vendors have strong GSTR-1 filing records. Your ITC is well-protected.',
    } as AIResult)
  }

  const vendorList = riskyVendors
    .slice(0, 10)
    .map(
      (v) =>
        `${v.vendorName} (GSTIN: ${v.gstin ?? 'Unregistered'}, score: ${v.filingScore}%, reversed: ${v.reversedCount}/${v.totalPurchases}, ITC at risk: ₹${v.pendingITCAtRisk.toLocaleString('en-IN')})`
    )
    .join('\n')

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You are a GST compliance expert advising Indian SMBs on ITC risk from vendors who don't file GSTR-1 on time.

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "vendorName": "name",
      "risk": "one-line risk description under 60 chars",
      "suggestion": "specific action to protect ITC under 80 chars",
      "itcAmount": 0
    }
  ],
  "summary": "2-sentence executive summary of overall vendor ITC risk"
}

Include 1 recommendation per risky/caution vendor. Be specific and actionable.`,
        },
        {
          role: 'user',
          content: `Total ITC at risk: ₹${body.totalITCAtRisk.toLocaleString('en-IN')}\n\nVendors with filing issues:\n${vendorList}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as AIResult
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/vendor-reliability] Error:', err)
    return Response.json({ error: 'Could not generate recommendations' }, { status: 503 })
  }
}
