import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { Invoice } from '@/types/invoice'

interface DisputeRequest {
  invoice: Invoice
  disputeReason: string
  disputedAmount: number
}

export interface DisputeResponse {
  letterText: string
  keyPoints: string[]
  interestCalculation: number
  suggestedResolution: string
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - due) / 86400000))
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: DisputeRequest
  try {
    body = await req.json() as DisputeRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { invoice, disputeReason, disputedAmount } = body

  const daysOverdue = getDaysOverdue(invoice.dueDate)
  // 18% per annum interest on disputed amount
  const interestCalculation = Math.round((disputedAmount * 0.18 * daysOverdue) / 365)

  const contextText = `Invoice Number: ${invoice.invoiceNumber}
Invoice Date: ${invoice.invoiceDate}
Due Date: ${invoice.dueDate}
Days Overdue: ${daysOverdue}
Customer: ${invoice.customerSnapshot.name}
Supplier (us): [Business Name]
Total Invoice Amount: ₹${invoice.grandTotal.toLocaleString('en-IN')}
Disputed Amount: ₹${disputedAmount.toLocaleString('en-IN')}
Interest Accrued (18% p.a. for ${daysOverdue} days): ₹${interestCalculation.toLocaleString('en-IN')}
Dispute Reason: ${disputeReason}`

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: `You are a legal document assistant specialising in Indian business disputes and GST law.

Generate a formal dispute/payment demand letter for an overdue invoice. Reference GST Act Section 31 (tax invoice requirements), MSME Act provisions where relevant, and applicable payment terms.

Return ONLY valid JSON:
{
  "letterText": "full formal letter text (use \\n for line breaks, keep professional and concise, 250-350 words)",
  "keyPoints": ["key legal point 1 under 80 chars", "key point 2", "key point 3"],
  "suggestedResolution": "one sentence resolution suggestion under 120 chars"
}

The letter must include: subject line, date, formal salutation, invoice reference, dispute details, interest accrued, payment deadline (14 days from today), legal consequences, and sign-off.`,
        },
        {
          role: 'user',
          content: contextText,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    let parsed: { letterText: string; keyPoints: string[]; suggestedResolution: string }
    try {
      const p = JSON.parse(raw)
      if (typeof p !== 'object' || p === null || typeof p.letterText !== 'string') throw new Error('Bad shape')
      parsed = p as { letterText: string; keyPoints: string[]; suggestedResolution: string }
    } catch (parseErr) {
      console.error('[AI/dispute-template] Parse error:', parseErr)
      return Response.json({ error: 'Could not parse AI response' }, { status: 503 })
    }

    return Response.json({ ...parsed, interestCalculation } satisfies DisputeResponse)
  } catch (err) {
    console.error('[AI/dispute-template] Error:', err)
    return Response.json({ error: 'Could not generate dispute letter' }, { status: 503 })
  }
}
