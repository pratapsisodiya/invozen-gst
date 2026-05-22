import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { OptimalPaymentEntry } from '@/types/paymentOptimizer'

interface PaymentOptimizerRequest {
  queue: OptimalPaymentEntry[]
  totalCash: number
  period: string
}

interface AIResult {
  alerts: string[]
  summary: string
  totalITCSaved: number
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: PaymentOptimizerRequest
  try {
    body = await req.json() as PaymentOptimizerRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (body.queue.length === 0) {
    return Response.json({ alerts: [], summary: 'No outstanding vendor payments with ITC at stake.', totalITCSaved: 0 } as AIResult)
  }

  const criticalEntries = body.queue.filter((e) => e.urgencyTier === 'critical' || e.urgencyTier === 'high')
  const totalITCAtStake = body.queue.reduce((s, e) => s + e.itcAtStake, 0)
  const affordableITC = body.queue.filter((e) => e.canAfford).reduce((s, e) => s + e.itcAtStake, 0)

  const queueText = body.queue
    .slice(0, 10)
    .map(
      (e, i) =>
        `${i + 1}. ${e.vendorName} | ₹${e.amountDue.toLocaleString('en-IN')} | ITC: ₹${e.itcAtStake.toLocaleString('en-IN')} | 180-day deadline in ${e.daysUntil180}d | ${e.urgencyTier.toUpperCase()} | ${e.canAfford ? 'Affordable' : 'Exceeds budget'}`
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
          content: `You are a GST and cash flow advisor for Indian SMBs. Analyze vendor payment priority to maximize ITC claims.

Return ONLY valid JSON:
{
  "alerts": ["specific alert under 100 chars", "..."],
  "summary": "2-sentence executive summary of payment strategy",
  "totalITCSaved": estimated ITC amount in rupees that will be protected by following the queue
}

Include 2-4 specific alerts with vendor names and amounts. Be precise.`,
        },
        {
          role: 'user',
          content: `Available cash: ₹${body.totalCash.toLocaleString('en-IN')}
Total ITC at stake: ₹${totalITCAtStake.toLocaleString('en-IN')}
Affordable ITC (within budget): ₹${affordableITC.toLocaleString('en-IN')}
Critical/High entries: ${criticalEntries.length}

Payment Queue:
${queueText}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as AIResult
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/payment-optimizer] Error:', err)
    return Response.json({ error: 'Could not generate payment advice' }, { status: 503 })
  }
}
