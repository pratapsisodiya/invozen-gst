import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { GSTR1Summary, GSTR3BSummary } from '@/types/gst'

interface GSTR9AssistRequest {
  gstr1Summaries: GSTR1Summary[]
  gstr3bSummaries: GSTR3BSummary[]
  financialYear: string
}

interface ReconciliationGap {
  description: string
  gstr1Amount: number
  gstr3bAmount: number
  difference: number
}

interface GSTR9AssistResult {
  reconciliationGaps: ReconciliationGap[]
  suggestions: string[]
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: GSTR9AssistRequest
  try {
    body = await req.json() as GSTR9AssistRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { gstr1Summaries, gstr3bSummaries, financialYear } = body

  // Pre-compute annual totals from GSTR-1
  const gstr1Totals = gstr1Summaries.reduce(
    (acc, s) => {
      acc.taxableValue += s.totals.taxableValue
      acc.cgst += s.totals.cgst
      acc.sgst += s.totals.sgst
      acc.igst += s.totals.igst
      acc.totalTax += s.totals.totalTax
      return acc
    },
    { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 }
  )

  // Pre-compute annual totals from GSTR-3B
  const gstr3bTotals = gstr3bSummaries.reduce(
    (acc, s) => {
      acc.outputCgst += s.taxLiability.outputCgst
      acc.outputSgst += s.taxLiability.outputSgst
      acc.outputIgst += s.taxLiability.outputIgst
      acc.totalOutput += s.taxLiability.totalOutput
      acc.netItc += s.itcAvailable.netItc
      return acc
    },
    { outputCgst: 0, outputSgst: 0, outputIgst: 0, totalOutput: 0, netItc: 0 }
  )

  const r = (n: number) => Math.round(n * 100) / 100

  const contextText = `Financial Year: ${financialYear}
GSTR-1 Annual (12 months):
  Taxable Value: ₹${r(gstr1Totals.taxableValue).toLocaleString('en-IN')}
  CGST: ₹${r(gstr1Totals.cgst).toLocaleString('en-IN')}
  SGST: ₹${r(gstr1Totals.sgst).toLocaleString('en-IN')}
  IGST: ₹${r(gstr1Totals.igst).toLocaleString('en-IN')}
  Total Tax: ₹${r(gstr1Totals.totalTax).toLocaleString('en-IN')}

GSTR-3B Annual (12 months):
  Output CGST: ₹${r(gstr3bTotals.outputCgst).toLocaleString('en-IN')}
  Output SGST: ₹${r(gstr3bTotals.outputSgst).toLocaleString('en-IN')}
  Output IGST: ₹${r(gstr3bTotals.outputIgst).toLocaleString('en-IN')}
  Total Output Tax: ₹${r(gstr3bTotals.totalOutput).toLocaleString('en-IN')}
  Net ITC Claimed: ₹${r(gstr3bTotals.netItc).toLocaleString('en-IN')}`

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: `You are a GST compliance expert helping prepare GSTR-9 annual returns for Indian businesses.

Analyze the provided GSTR-1 and GSTR-3B annual totals. Identify reconciliation gaps where the amounts differ between returns. This is required for GSTR-9 Table 4 (outward supplies) and Table 6 (ITC).

Return ONLY valid JSON:
{
  "reconciliationGaps": [
    {
      "description": "brief description of gap under 80 chars",
      "gstr1Amount": number,
      "gstr3bAmount": number,
      "difference": number
    }
  ],
  "suggestions": ["suggestion under 100 chars", "suggestion 2", "suggestion 3"]
}

Include up to 4 gaps where meaningful differences exist. Compute difference as gstr1Amount minus gstr3bAmount. Suggestions should be practical steps for GSTR-9 filing. If totals match well (difference < 1000), note that reconciliation is clean.`,
        },
        {
          role: 'user',
          content: contextText,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    let parsed: GSTR9AssistResult
    try {
      const p = JSON.parse(raw)
      if (typeof p !== 'object' || p === null || !Array.isArray(p.reconciliationGaps)) throw new Error('Bad shape')
      parsed = p as GSTR9AssistResult
    } catch (parseErr) {
      console.error('[AI/gstr9-assist] Parse error:', parseErr)
      return Response.json({ error: 'Could not parse AI response' }, { status: 503 })
    }

    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/gstr9-assist] Error:', err)
    return Response.json({ error: 'Could not run GSTR-9 analysis' }, { status: 503 })
  }
}
