import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { NoticeAIResult, NoticeType } from '@/types/notice'

interface GSTNoticeRequest {
  noticeText: string
  noticeType: string
  period: string
  businessContext: {
    gstin: string
    businessName: string
    totalTaxable: number
    totalTax: number
  }
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: GSTNoticeRequest
  try {
    body = await req.json() as GSTNoticeRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.noticeText || body.noticeText.trim().length < 20) {
    return Response.json({ error: 'Notice text too short' }, { status: 400 })
  }

  const noticeExcerpt = body.noticeText.slice(0, 3000)

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: `You are a senior GST advocate specializing in Indian GST law and compliance. Analyze GST notices and draft professional replies.

GST notice types: ASMT-10 (scrutiny), ASMT-12 (acceptance), DRC-01 (demand), SCN (show cause), REG-03 (registration deficiency), RFD-09 (refund), ADH-01 (adjudication).

Return ONLY valid JSON:
{
  "noticeType": "demand_notice"|"show_cause"|"deficiency_memo"|"audit_notice"|"scrutiny"|"other",
  "keyDemands": ["demand 1 under 80 chars", "demand 2 under 80 chars"],
  "riskLevel": "low"|"medium"|"high",
  "deadline": "extracted deadline date or null",
  "actionItems": ["action 1 under 80 chars", "action 2"],
  "suggestedReply": "Full structured reply starting with subject line, then body paragraphs, then closing. Use GSTIN and business name from context. Address each demand point by point. Professional legal tone. 200-350 words."
}

Include 2-4 keyDemands, 3-5 actionItems. suggestedReply must be a complete, formal letter.`,
        },
        {
          role: 'user',
          content: `Business: ${body.businessContext.businessName}
GSTIN: ${body.businessContext.gstin || 'Not provided'}
Period: ${body.period}
Taxable turnover: ₹${body.businessContext.totalTaxable.toLocaleString('en-IN')}
Total tax: ₹${body.businessContext.totalTax.toLocaleString('en-IN')}

NOTICE TEXT:
${noticeExcerpt}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as NoticeAIResult
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/gst-notice] Error:', err)
    return Response.json({ error: 'Could not analyze notice' }, { status: 503 })
  }
}
