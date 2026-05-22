import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import { STATE_CODES } from '@/lib/gst/constants'

interface ParseCustomerRequest {
  text: string
}

export interface ParsedCustomer {
  name: string
  businessName: string
  gstin: string
  email: string
  phone: string
  state: string
  stateCode: string
  city: string
  addressLine1: string
  pincode: string
  customerType: 'b2b' | 'b2c'
  confidence: 'high' | 'medium' | 'low'
  extracted: string[]
}

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

const STATE_LIST = Object.entries(STATE_CODES).map(([name, code]) => `${name} (${code})`).join(', ')

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: ParseCustomerRequest
  try {
    body = await req.json() as ParseCustomerRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.text?.trim()) {
    return Response.json({ error: 'Text is required' }, { status: 400 })
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: `You are a customer data extraction assistant for an Indian GST business application.

Extract structured customer information from free-form text. Indian context rules:
- GSTIN format: 2-digit state code + 10-char PAN + 1 entity + 1Z + 1 check (e.g., 27ABCDE1234F1Z5)
- If GSTIN present → customerType is "b2b", else "b2c"
- Indian states: ${STATE_LIST}
- Extract state code from GSTIN prefix if GSTIN provided (e.g., "27" = Maharashtra)
- Phone: 10 digits, may have +91 prefix
- If a field cannot be determined, use empty string ""

Return ONLY valid JSON:
{
  "name": "contact person name",
  "businessName": "company/trade name",
  "gstin": "GSTIN if found else empty",
  "email": "email if found else empty",
  "phone": "10-digit phone else empty",
  "state": "state name",
  "stateCode": "2-digit code",
  "city": "city name",
  "addressLine1": "street address",
  "pincode": "6-digit pincode",
  "customerType": "b2b or b2c",
  "confidence": "high/medium/low",
  "extracted": ["list of fields successfully extracted"]
}`
        },
        {
          role: 'user',
          content: `Extract customer details from: "${body.text}"`
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    const parsed = JSON.parse(raw) as ParsedCustomer
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/parse-customer] Error:', err)
    return Response.json({ error: 'Could not parse customer details' }, { status: 503 })
  }
}
