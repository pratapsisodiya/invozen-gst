import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface QuickExpenseRequest {
  text: string
}

export interface ParsedExpense {
  description: string
  category: string
  amount: number
  vendorName: string
  gstRate: number
  isGstRegistered: boolean
  isItcEligible: boolean
  paymentMethod: string
  notes: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

const VALID_CATEGORIES = [
  'rent', 'salary', 'utilities', 'travel', 'meals', 'office_supplies',
  'professional_fees', 'marketing', 'repairs', 'insurance', 'other'
]

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: QuickExpenseRequest
  try {
    body = await req.json() as QuickExpenseRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.text?.trim()) {
    return Response.json({ error: 'Text is required' }, { status: 400 })
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 350,
      messages: [
        {
          role: 'system',
          content: `You are an Indian GST expense parser. Parse free-form expense descriptions into structured data.

Valid categories: ${VALID_CATEGORIES.join(', ')}
Valid GST rates: 0, 5, 12, 18, 28
ITC BLOCKED under Section 17(5): food/meals, personal travel, club membership, health/beauty

Rules:
- Extract amount as number (no currency symbols)
- If GST vendor is mentioned, isGstRegistered = true
- ITC is eligible unless it falls under Section 17(5) blocked categories
- paymentMethod: cash, upi, card, bank_transfer, cheque
- confidence: high if amount+description clear, medium if some inference, low if guessed

Return ONLY valid JSON:
{
  "description": "clean expense description",
  "category": "from valid categories",
  "amount": 0,
  "vendorName": "vendor name or empty",
  "gstRate": 18,
  "isGstRegistered": false,
  "isItcEligible": false,
  "paymentMethod": "cash",
  "notes": "any extra info",
  "confidence": "high/medium/low",
  "reasoning": "brief explanation under 15 words"
}`
        },
        {
          role: 'user',
          content: `Parse expense: "${body.text}"`
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as ParsedExpense
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/quick-expense] Error:', err)
    return Response.json({ error: 'Could not parse expense' }, { status: 503 })
  }
}
