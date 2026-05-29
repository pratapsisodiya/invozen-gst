import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface PdfAssistRequest {
  documentType: string
  businessName: string
  summary: string
  highlights: string[]
  metrics?: Array<{ label: string; value: string }>
}

interface PdfAssistResponse {
  headline: string
  bullets: string[]
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  let body: PdfAssistRequest

  try {
    body = await req.json() as PdfAssistRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const headlineFallback = `AI Assist for ${body.documentType}`
  const promptSummary = `${body.summary}\n${body.highlights.join('\n')}`

  if (!process.env.GROQ_API_KEY) {
    const bullets = body.highlights.slice(0, 3)
    return Response.json({ headline: headlineFallback, bullets: bullets.length ? bullets : ['Review before sharing.'] } satisfies PdfAssistResponse)
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 260,
      messages: [
        {
          role: 'system',
          content: `You are a concise GST and bookkeeping assistant that writes useful, practical PDF side-notes for Indian businesses.

Return ONLY valid JSON:
{
  "headline": "short title under 70 chars",
  "bullets": ["bullet 1 under 90 chars", "bullet 2", "bullet 3"]
}

Rules:
- Keep the tone practical and non-generic.
- Use the document type and provided figures.
- Return 2-3 bullets.
- Do not mention that you are an AI model.
- Do not add any text outside JSON.`,
        },
        {
          role: 'user',
          content: `Business: ${body.businessName}\nDocument type: ${body.documentType}\n\nSummary:\n${promptSummary}\n\nMetrics:\n${(body.metrics ?? []).map((metric) => `${metric.label}: ${metric.value}`).join('\n') || 'N/A'}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as Partial<PdfAssistResponse>
    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.filter((bullet): bullet is string => typeof bullet === 'string' && bullet.trim().length > 0).slice(0, 3)
      : []

    return Response.json({
      headline: typeof parsed.headline === 'string' && parsed.headline.trim().length > 0 ? parsed.headline : headlineFallback,
      bullets: bullets.length ? bullets : body.highlights.slice(0, 3),
    } satisfies PdfAssistResponse)
  } catch (err) {
    console.error('[AI/pdf-assist] Error:', err)
    return Response.json({ headline: headlineFallback, bullets: body.highlights.slice(0, 3) || ['Review before sharing.'] } satisfies PdfAssistResponse)
  }
}