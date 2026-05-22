import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { SchemeComparison } from '@/types/schemeComparison'

interface SchemeRequest {
  comparison: SchemeComparison
  businessContext: { industry: string; b2bRatio: number }
}

interface AIResult {
  recommendation: string
  reasoning: string[]
  risks: string[]
  timeline: string
  switchingSteps: string[]
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: SchemeRequest
  try {
    body = await req.json() as SchemeRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const c = body.comparison

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are a senior Chartered Accountant specializing in Indian GST compliance. Advise on composition vs regular GST scheme.

Return ONLY valid JSON:
{
  "recommendation": "clear 1-2 sentence recommendation under 150 chars",
  "reasoning": ["reason 1 under 80 chars", "reason 2", "reason 3"],
  "risks": ["risk 1 under 80 chars", "risk 2"],
  "timeline": "when to switch if applicable (e.g. start of next FY on April 1)",
  "switchingSteps": ["step 1 e.g. File GST CMP-02 on GSTN portal before Mar 31", "step 2", "step 3"]
}

Include 3 reasons, 2-3 risks, 3-4 switching steps. Be specific about Indian GST law (CMP-02, annual return GSTR-4, etc.).`,
        },
        {
          role: 'user',
          content: `Industry: ${body.businessContext.industry}
Annual revenue: ₹${c.annualizedRevenue.toLocaleString('en-IN')}
B2B ratio: ${Math.round(body.businessContext.b2bRatio)}%
Current scheme: ${c.currentScheme}
Eligible: ${c.eligibleForComposition}

Regular scheme: Output GST ₹${c.regularScheme.outputGST.toLocaleString('en-IN')}, ITC ₹${c.regularScheme.itcClaimed.toLocaleString('en-IN')}, Net ₹${c.regularScheme.netGSTPaid.toLocaleString('en-IN')}, ${c.regularScheme.annualFilings} filings/yr
Composition scheme: Tax ₹${c.compositionScheme.compositionTax.toLocaleString('en-IN')} @ ${c.compositionScheme.compositionRate}%, Net ₹${c.compositionScheme.netGSTPaid.toLocaleString('en-IN')}, ${c.compositionScheme.annualFilings} filings/yr
Savings if switch: ₹${c.savingsIfSwitch.toLocaleString('en-IN')} (positive = composition saves money)
Recommendation: ${c.recommendation}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as AIResult
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/scheme-intelligence] Error:', err)
    return Response.json({ error: 'Could not generate scheme analysis' }, { status: 503 })
  }
}
