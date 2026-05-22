import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface AutofillRequest {
  customerName: string
  customerGstin: string | null
  recentLineItems: Array<{
    description: string
    hsnSac: string
    quantity: number
    unit: string
    rate: number
    gstRate: number
  }>
  availableItems: Array<{
    id: string
    name: string
    hsnSac: string
    rate: number
    gstRate: number
    unit: string
  }>
}

interface SuggestedLineItem {
  itemId: string | null
  description: string
  hsnSac: string
  quantity: number
  unit: string
  rate: number
  gstRate: number
  reason: string
}

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: AutofillRequest
  try {
    body = await req.json() as AutofillRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.recentLineItems.length) {
    return Response.json({ items: [], message: 'No purchase history for this customer' })
  }

  const historyText = body.recentLineItems.slice(0, 15).map((li, i) =>
    `${i + 1}. ${li.description} | HSN: ${li.hsnSac || 'N/A'} | Qty: ${li.quantity} ${li.unit} | Rate: ₹${li.rate} | GST: ${li.gstRate}%`
  ).join('\n')

  const catalogText = body.availableItems.slice(0, 20).map((item) =>
    `ID:${item.id} | ${item.name} | HSN: ${item.hsnSac} | Rate: ₹${item.rate} | GST: ${item.gstRate}% | Unit: ${item.unit}`
  ).join('\n')

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You are an invoice assistant for an Indian GST business. Based on a customer's recent purchase history, suggest the most likely line items for their next invoice.

Rules:
- Suggest 1-4 items based on frequency in history
- If the item matches something in the catalog, use that item's ID, rate, HSN, and unit
- If not in catalog, use itemId: null and infer from history
- Use realistic quantities based on history
- Valid GST rates: 0, 5, 12, 18, 28
- Keep reason under 12 words

Return ONLY valid JSON:
{"items": [{"itemId": "id or null", "description": "...", "hsnSac": "...", "quantity": 1, "unit": "NOS", "rate": 0, "gstRate": 18, "reason": "..."}]}`
        },
        {
          role: 'user',
          content: `Customer: ${body.customerName} (${body.customerGstin || 'B2C'})

Recent items billed to this customer:
${historyText}

Your item catalog:
${catalogText || 'No catalog items available'}

Suggest likely items for next invoice.`
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as { items: SuggestedLineItem[] }
    const items = Array.isArray(parsed?.items) ? parsed.items.slice(0, 4) : []
    return Response.json({ items })
  } catch (err) {
    console.error('[AI/autofill-items] Error:', err)
    return Response.json({ error: 'Could not generate suggestions' }, { status: 503 })
  }
}
