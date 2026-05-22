import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface ClassifyExpenseRequest {
  description: string
  amount: number
  vendorName?: string
}

export interface ExpenseClassification {
  category: string
  isGstApplicable: boolean
  suggestedGstRate: number
  hsnSac: string
  isItcClaimable: boolean
  itcBlockReason: string | null
  confidence: 'high' | 'medium' | 'low'
}

const VALID_CATEGORIES = [
  'office_supplies', 'rent', 'utilities', 'travel', 'meals_entertainment',
  'software', 'hardware', 'professional_services', 'advertising', 'repairs',
  'salary', 'insurance', 'bank_charges', 'courier', 'miscellaneous',
]

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: ClassifyExpenseRequest
  try {
    body = await req.json() as ClassifyExpenseRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 250,
      messages: [
        {
          role: 'system',
          content: `You are an Indian GST expense classification expert. Classify business expenses and determine ITC eligibility.

Valid categories: ${VALID_CATEGORIES.join(', ')}

ITC BLOCKED under GST Section 17(5):
- meals_entertainment: food, beverages, outdoor catering → ITC blocked
- motor_vehicle personal use → ITC blocked
- club memberships → ITC blocked
- beauty/health treatments → ITC blocked
- works contract for immovable property → ITC blocked

ITC ALLOWED: office supplies, rent (commercial), utilities, software, hardware, professional services, advertising, repairs (plant/machinery), courier

Return ONLY valid JSON:
{
  "category": "one of the valid categories",
  "isGstApplicable": true/false,
  "suggestedGstRate": 0/5/12/18/28,
  "hsnSac": "HSN or SAC code",
  "isItcClaimable": true/false,
  "itcBlockReason": null or "reason why ITC is blocked",
  "confidence": "high"|"medium"|"low"
}`,
        },
        {
          role: 'user',
          content: `Expense: "${body.description}"
Amount: ₹${body.amount.toLocaleString('en-IN')}
${body.vendorName ? `Vendor: ${body.vendorName}` : ''}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    let parsed: ExpenseClassification
    try {
      const p = JSON.parse(raw)
      if (typeof p !== 'object' || p === null || !('category' in p)) throw new Error('Bad shape')
      parsed = p as ExpenseClassification
    } catch (parseErr) {
      console.error('[AI/classify-expense] Parse error:', parseErr)
      return Response.json({ error: 'Could not parse AI response' }, { status: 503 })
    }
    return Response.json({ ...parsed, isItcEligible: parsed.isItcClaimable, reasoning: parsed.itcBlockReason ?? 'ITC eligible' })
  } catch (err) {
    console.error('[AI/classify-expense] Error:', err)
    return Response.json({ error: 'Could not classify expense' }, { status: 503 })
  }
}
