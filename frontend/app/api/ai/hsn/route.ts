import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

interface HsnRequest {
  description: string
  itemType: 'product' | 'service'
}

interface HsnResponse {
  hsnCode: string
  gstRate: number
  reasoning: string
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: HsnRequest
  try {
    body = await req.json() as HsnRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: `You are an Indian GST expert. Given an item description, suggest the most appropriate HSN code (for goods) or SAC code (for services) and the applicable GST rate.

Rules:
- HSN codes are 4-8 digits for goods
- SAC codes are 6 digits starting with 99 for services
- GST rates must be one of: 0, 5, 12, 18, 28
- Return ONLY valid JSON: {"hsnCode": "...", "gstRate": ..., "reasoning": "..."}
- Keep reasoning under 20 words
- Do not add markdown or any text outside the JSON`,
      messages: [{ role: 'user', content: `Item: ${body.description}\nType: ${body.itemType}` }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text.trim()) as HsnResponse
    return Response.json(parsed)
  } catch {
    return Response.json({ error: 'Could not determine HSN code' }, { status: 422 })
  }
}
