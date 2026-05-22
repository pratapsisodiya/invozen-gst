import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'
import type { Vendor, PurchaseInvoice } from '@/types/purchase'

interface VendorRiskRequest {
  vendor: Vendor
  purchases: PurchaseInvoice[]
}

export interface VendorRiskResponse {
  riskScore: 'low' | 'medium' | 'high'
  flags: string[]
  itcRiskAmount: number
  recommendations: string[]
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: VendorRiskRequest
  try {
    body = await req.json() as VendorRiskRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { vendor, purchases } = body

  const totalPurchases = purchases.reduce((s, p) => s + p.taxableValue, 0)
  const totalItc = purchases.reduce((s, p) => s + p.lineItems.filter((li) => li.itcEligible).reduce((a, li) => a + li.igst + li.cgst + li.sgst, 0), 0)
  const rejectedCount = purchases.filter((p) => p.status === 'rejected').length
  const claimedCount = purchases.filter((p) => p.status === 'claimed').length
  const avgInvoiceValue = purchases.length > 0 ? totalPurchases / purchases.length : 0

  const contextText = `Vendor: ${vendor.businessName || vendor.name}
GSTIN: ${vendor.gstin || 'UNREGISTERED'}
State: ${vendor.gstinState || 'Unknown'}
Total Purchases: ₹${totalPurchases.toLocaleString('en-IN')} across ${purchases.length} invoices
Average Invoice Value: ₹${Math.round(avgInvoiceValue).toLocaleString('en-IN')}
Total ITC on File: ₹${Math.round(totalItc).toLocaleString('en-IN')}
ITC Claimed: ${claimedCount} invoices
Rejected Purchases: ${rejectedCount}
Registered: ${vendor.gstin ? 'Yes' : 'No'}`

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 450,
      messages: [
        {
          role: 'system',
          content: `You are a GST compliance expert assessing ITC reversal risk for Indian businesses.

Analyze the vendor data and assess the risk of ITC reversal (under GST Act Section 16 and 17). Consider: GSTIN presence, registration status, purchase patterns, rejection history.

Return ONLY valid JSON:
{
  "riskScore": "low" | "medium" | "high",
  "flags": ["flag 1 under 80 chars", "flag 2"],
  "itcRiskAmount": number (rupees at risk of reversal, 0 if low risk),
  "recommendations": ["recommendation under 90 chars", "recommendation 2"]
}

flags: up to 3 specific compliance risk flags.
recommendations: 2 actionable steps.
itcRiskAmount: estimate based on ITC on file and risk level.`,
        },
        {
          role: 'user',
          content: contextText,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    let parsed: VendorRiskResponse
    try {
      const p = JSON.parse(raw)
      if (typeof p !== 'object' || p === null || !['low', 'medium', 'high'].includes(p.riskScore)) throw new Error('Bad shape')
      parsed = p as VendorRiskResponse
    } catch (parseErr) {
      console.error('[AI/vendor-risk] Parse error:', parseErr)
      return Response.json({ error: 'Could not parse AI response' }, { status: 503 })
    }

    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/vendor-risk] Error:', err)
    return Response.json({ error: 'Could not assess vendor risk' }, { status: 503 })
  }
}
