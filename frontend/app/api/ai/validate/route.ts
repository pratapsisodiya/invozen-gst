import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface ValidateLineItem {
  description: string
  hsnSac: string
  gstRate: number
  discountPercent: number
  rate: number
}

interface ValidateRequest {
  lineItems: ValidateLineItem[]
  customerType: 'b2b' | 'b2c'
  invoiceType: string
}

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: ValidateRequest
  try {
    body = await req.json() as ValidateRequest
  } catch {
    return Response.json({ warnings: [] })
  }

  const itemSummary = body.lineItems.map((li, i) =>
    `${i + 1}. "${li.description}" — HSN/SAC: "${li.hsnSac || 'MISSING'}", GST: ${li.gstRate}%, Discount: ${li.discountPercent}%, Rate: ₹${li.rate}`
  ).join('\n')

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 256,
      messages: [
        {
          role: 'system',
          content: `You are an Indian GST compliance checker. Review invoice line items and return a JSON array of warnings.

Check for:
- HSN/SAC code missing on B2B invoices (mandatory for tax invoices with registered customers)
- GST rate appears clearly incorrect for the described item (e.g., basic food items at 18%)
- Discount exceeding 40% (unusual, may trigger audit)
- Item description too vague to determine correct classification

Return ONLY valid JSON: {"warnings": ["warning 1", "warning 2"]}
Return empty array if no issues: {"warnings": []}
Maximum 5 warnings. Each warning under 100 characters. Do not add text outside the JSON.`,
        },
        {
          role: 'user',
          content: `Invoice type: ${body.invoiceType}\nCustomer type: ${body.customerType}\n\nLine items:\n${itemSummary}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    try {
      const parsed = JSON.parse(raw) as { warnings: unknown }
      const warnings = Array.isArray(parsed?.warnings)
        ? parsed.warnings.filter((w): w is string => typeof w === 'string')
        : []
      return Response.json({ warnings })
    } catch (parseErr) {
      console.error('[AI/validate] Parse error:', parseErr)
      return Response.json({ warnings: [], parseError: true })
    }
  } catch (err) {
    console.error('[AI/validate] Error:', err)
    return Response.json({ warnings: [] })
  }
}
