import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface HsnRequest {
  description: string
  itemType: 'product' | 'service'
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: HsnRequest
  try {
    body = await req.json() as HsnRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const systemPrompt = `You are an Indian GST HSN/SAC code expert. Given a product or service description, return ONLY valid JSON with exactly these fields:
- hsnCode: string (4-8 digit HSN for goods, 6-digit SAC starting with 99 for services)
- gstRate: number (one of: 0, 5, 12, 18, 28)
- reasoning: string (under 20 words explaining the code choice)

Return ONLY the JSON object. No markdown, no explanation, no code fences.`

    const userMessage = `${body.itemType === 'service' ? 'Service' : 'Product'}: "${body.description}"`

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 150,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    })

    let text = response.choices[0]?.message?.content ?? '{}'
    text = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()

    const parsed = JSON.parse(text)
    return Response.json({
      hsnCode: String(parsed.hsnCode ?? ''),
      gstRate: Number(parsed.gstRate ?? 18),
      reasoning: String(parsed.reasoning ?? ''),
    })
  } catch (err) {
    console.error('[AI/hsn] Error:', err)
    return Response.json({ error: 'Could not determine HSN code' }, { status: 500 })
  }
}
