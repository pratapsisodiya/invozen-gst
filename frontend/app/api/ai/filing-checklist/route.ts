import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface FilingChecklistRequest {
  filingType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' | 'GSTR-9C'
  period: string
  businessProfile: {
    registrationType: string
    filingFrequency: string
    state: string
    industry: string
  }
  dataSummary: {
    invoiceCount: number
    purchaseCount: number
    creditNoteCount: number
    b2bCount: number
    hasExports: boolean
    hasNilRated: boolean
  }
}

export interface ChecklistItem {
  id: string
  title: string
  description: string
  priority: 'critical' | 'important' | 'optional'
  category: string
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: FilingChecklistRequest
  try {
    body = await req.json() as FilingChecklistRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: `You are an Indian GST filing expert. Generate a customized pre-filing checklist based on business profile and data.

Return ONLY valid JSON:
{
  "items": [
    {
      "id": "unique_id",
      "title": "checklist item title under 60 chars",
      "description": "specific action to take under 100 chars",
      "priority": "critical"|"important"|"optional",
      "category": "Data Verification"|"Tax Calculation"|"ITC"|"Reconciliation"|"Submission"
    }
  ],
  "deadlineWarning": null or "specific deadline warning"
}

Generate 8-12 items specific to this filing type and business situation. Critical items must be completed before filing.`,
        },
        {
          role: 'user',
          content: `Filing: ${body.filingType} for ${body.period}
Business: ${body.businessProfile.registrationType} | ${body.businessProfile.filingFrequency} filer | ${body.businessProfile.state} | ${body.businessProfile.industry}
Data: ${body.dataSummary.invoiceCount} invoices, ${body.dataSummary.purchaseCount} purchases, ${body.dataSummary.creditNoteCount} credit notes
B2B count: ${body.dataSummary.b2bCount} | Has exports: ${body.dataSummary.hasExports} | Has nil-rated: ${body.dataSummary.hasNilRated}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as { items: ChecklistItem[]; deadlineWarning: string | null }
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/filing-checklist] Error:', err)
    return Response.json({ error: 'Could not generate checklist' }, { status: 503 })
  }
}
