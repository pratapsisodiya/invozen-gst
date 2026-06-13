import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface MatchCandidate {
  id: string
  invoiceNumber: string
  customerName: string
  balanceDue: number
  dueDate: string
}

interface MatchRequest {
  transaction: {
    description: string
    amount: number
    date: string
    reference: string | null
  }
  candidates: MatchCandidate[]
}

interface MatchResponse {
  invoiceId: string | null
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  suggestedAction: 'link_invoice' | 'record_advance'
}

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function fallbackMatch(body: MatchRequest): MatchResponse {
  const normalized = body.transaction.description.toLowerCase()
  const candidates = body.candidates
    .map((candidate) => {
      let score = 0
      if (Math.abs(candidate.balanceDue - body.transaction.amount) < 1) score += 4
      if (normalized.includes(candidate.invoiceNumber.toLowerCase())) score += 5
      if (normalized.includes(candidate.customerName.toLowerCase())) score += 3
      if (Math.abs(candidate.balanceDue - body.transaction.amount) <= 500) score += 1
      return { candidate, score }
    })
    .sort((a, b) => b.score - a.score)

  const top = candidates[0]
  if (!top || top.score < 3) {
    return {
      invoiceId: null,
      confidence: 'low',
      reasoning: 'No strong invoice match was found from amount and description, so this looks more like an advance receipt.',
      suggestedAction: 'record_advance',
    }
  }

  return {
    invoiceId: top.candidate.id,
    confidence: top.score >= 6 ? 'high' : 'medium',
    reasoning: `Best match is ${top.candidate.invoiceNumber} for ${top.candidate.customerName} based on description and amount proximity.`,
    suggestedAction: 'link_invoice',
  }
}

export async function POST(req: NextRequest) {
  let body: MatchRequest
  try {
    body = await req.json() as MatchRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.candidates.length || !process.env.GROQ_API_KEY) {
    return Response.json(fallbackMatch(body))
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 250,
      messages: [
        {
          role: 'system',
          content: `You help reconcile bank receipts for an Indian GST business.

Return ONLY valid JSON:
{
  "invoiceId": "candidate id or null",
  "confidence": "high|medium|low",
  "reasoning": "one practical sentence",
  "suggestedAction": "link_invoice|record_advance"
}

Pick record_advance when no candidate is credible.
Do not invent candidate ids.`
        },
        {
          role: 'user',
          content: JSON.stringify(body),
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as MatchResponse
    if (!parsed || !('suggestedAction' in parsed)) throw new Error('Invalid shape')
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/bank-recon-match] Error:', err)
    return Response.json(fallbackMatch(body))
  }
}
