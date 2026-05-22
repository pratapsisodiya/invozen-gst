import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface DraftInvoiceRequest {
  description: string
  availableCustomers: Array<{ id: string; name: string; gstin: string | null; state: string }>
  availableItems: Array<{ id: string; name: string; hsnCode: string | null; defaultRate: number; defaultGstRate: number }>
}

export interface DraftedInvoice {
  customerHint: string
  lineItems: Array<{
    description: string
    quantity: number
    rate: number
    gstRate: number
    hsnSac: string
    unit: string
  }>
  notes: string
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: DraftInvoiceRequest
  try {
    body = await req.json() as DraftInvoiceRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const customerList = body.availableCustomers.slice(0, 20)
    .map((c) => `${c.name} (${c.gstin || 'unregistered'}, ${c.state})`)
    .join('\n')

  const itemList = body.availableItems.slice(0, 30)
    .map((i) => `${i.name} — ₹${i.defaultRate}, GST ${i.defaultGstRate}%, HSN ${i.hsnCode || 'N/A'}`)
    .join('\n')

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are an Indian GST invoice drafting assistant. Given a natural language description, extract invoice details and return structured JSON.

Available customers:
${customerList || 'None listed'}

Available items (reference for pricing/HSN):
${itemList || 'None listed'}

Return ONLY valid JSON with this structure:
{
  "customerHint": "partial customer name to search for",
  "lineItems": [
    {
      "description": "item description",
      "quantity": 1,
      "rate": 0,
      "gstRate": 18,
      "hsnSac": "8471",
      "unit": "NOS"
    }
  ],
  "notes": "any special notes"
}

Rules:
- Use quantities and rates from the description
- Match item prices from the available items list if mentioned
- HSN codes: 4-8 digits for goods (e.g., 8471 for laptops), 6 digits starting with 99 for services
- Valid GST rates: 0, 5, 12, 18, 28
- Units: NOS, KGS, MTR, HRS, DAYS, PCS, etc.
- Return ONLY JSON, no markdown, no explanation`,
        },
        { role: 'user', content: body.description },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as DraftedInvoice
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/draft-invoice] Error:', err)
    return Response.json({ error: 'Could not draft invoice' }, { status: 503 })
  }
}
