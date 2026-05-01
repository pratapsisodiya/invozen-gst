import Anthropic from '@anthropic-ai/sdk'
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

interface ValidateResponse {
  warnings: string[]
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ warnings: [] })
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
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: `You are an Indian GST compliance checker. Review invoice line items and return a JSON array of warnings.

Check for:
- HSN/SAC code missing on B2B invoices (mandatory for tax invoices with registered customers)
- GST rate appears clearly incorrect for the described item (e.g., basic food items at 18%)
- Discount exceeding 40% (unusual, may trigger audit)
- Item description too vague to determine correct classification

Return ONLY valid JSON: {"warnings": ["warning 1", "warning 2"]}
Return empty array if no issues: {"warnings": []}
Maximum 5 warnings. Each warning under 100 characters. Do not add text outside the JSON.`,
      messages: [{
        role: 'user',
        content: `Invoice type: ${body.invoiceType}\nCustomer type: ${body.customerType}\n\nLine items:\n${itemSummary}`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text.trim()) as ValidateResponse
    return Response.json(parsed)
  } catch {
    return Response.json({ warnings: [] })
  }
}
