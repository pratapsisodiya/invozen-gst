import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { RCMFlag } from '@/types/rcm'

interface RCMScanRequest {
  flags: RCMFlag[]
  period: string
  businessName: string
}

interface RCMScanResult {
  totalLiability: number
  filingAdvice: string
  categoryBreakdown: Array<{ category: string; count: number; amount: number }>
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: RCMScanRequest
  try {
    body = await req.json() as RCMScanRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const totalLiability = body.flags.reduce((s, f) => s + f.rcmLiability, 0)

  if (body.flags.length === 0) {
    return Response.json({
      totalLiability: 0,
      filingAdvice: 'No RCM exposure detected for this period. All vendors appear to be GST-registered.',
      categoryBreakdown: [],
    } as RCMScanResult)
  }

  const breakdown: Record<string, { count: number; amount: number }> = {}
  for (const flag of body.flags) {
    if (!breakdown[flag.categoryLabel]) breakdown[flag.categoryLabel] = { count: 0, amount: 0 }
    breakdown[flag.categoryLabel].count++
    breakdown[flag.categoryLabel].amount += flag.rcmLiability
  }
  const categoryBreakdown = Object.entries(breakdown).map(([category, v]) => ({ category, ...v }))

  const flagsSummary = body.flags
    .slice(0, 15)
    .map((f) => `${f.vendorName} | ${f.categoryLabel} | ₹${f.taxableAmount.toLocaleString('en-IN')} taxable | RCM: ₹${f.rcmLiability.toLocaleString('en-IN')} | Confidence: ${f.confidence}`)
    .join('\n')

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: `You are a GST expert advising an Indian business on Reverse Charge Mechanism (RCM) compliance.
Under Section 9(3) and 9(4) of CGST Act, certain purchases from unregistered vendors attract RCM liability.
Provide concise, actionable GSTR-3B Table 3.1(d) filing advice.
Return ONLY plain text advice (2-3 paragraphs, no JSON, no markdown).`,
        },
        {
          role: 'user',
          content: `Business: ${body.businessName} | Period: ${body.period}
Total RCM liability detected: ₹${totalLiability.toLocaleString('en-IN')}

Detected RCM transactions:
${flagsSummary}

Advise on: (1) confirming these are genuine RCM liabilities, (2) how to declare in GSTR-3B Table 3.1(d), (3) ITC reclaim in Table 4.`,
        },
      ],
    })

    const filingAdvice = response.choices[0]?.message?.content?.trim() ?? ''

    return Response.json({
      totalLiability,
      filingAdvice,
      categoryBreakdown,
    } as RCMScanResult)
  } catch (err) {
    console.error('[AI/rcm-scan] Error:', err)
    return Response.json({ error: 'Could not generate RCM advice' }, { status: 503 })
  }
}
