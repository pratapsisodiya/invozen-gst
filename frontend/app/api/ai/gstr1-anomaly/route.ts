import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

interface GSTR1AnomalyRequest {
  period: string
  b2bEntries: Array<{
    customerGstin: string
    customerName: string
    invoiceNumber: string
    invoiceDate: string
    taxableValue: number
    cgst: number
    sgst: number
    igst: number
    placeOfSupply: string
  }>
  hsnSummary: Array<{
    hsnCode: string
    description: string
    taxableValue: number
    gstRate?: number
  }>
  b2cTotals: {
    taxableValue: number
    igst: number
  }
  businessState: string
  totalTaxable: number
  totalTax: number
}

export interface AnomalyIssue {
  severity: 'error' | 'warning'
  category: string
  message: string
  fix: string
}

function stripJsonFences(text: string): string {
  return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: GSTR1AnomalyRequest
  try {
    body = await req.json() as GSTR1AnomalyRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const b2bSummary = body.b2bEntries.slice(0, 20).map((e) =>
    `${e.invoiceNumber} | ${e.customerName} | GSTIN: ${e.customerGstin || 'MISSING'} | Taxable: ₹${e.taxableValue} | IGST: ₹${e.igst} | CGST: ₹${e.cgst} | SGST: ₹${e.sgst} | POS: ${e.placeOfSupply}`
  ).join('\n')

  const hsnSummaryText = body.hsnSummary.map((h) =>
    `HSN ${h.hsnCode || 'MISSING'}: ${h.description} | Taxable: ₹${h.taxableValue}`
  ).join('\n')

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: `You are an Indian GST compliance auditor. Analyze GSTR-1 data and identify anomalies, errors, and compliance risks.

Check for:
1. Missing or blank HSN/SAC codes (mandatory for B2B invoices)
2. Missing GSTIN for B2B entries (required for registered buyer invoices)
3. Wrong supply type: if seller state matches POS, should be CGST+SGST not IGST, and vice versa
4. Unusually high single invoices (>10% of total turnover in one invoice)
5. Zero-value invoices in B2B section
6. HSN codes that don't match item descriptions (e.g., software listed under goods HSN)
7. Invoices with IGST where B2B customer appears to be in same state

Return ONLY valid JSON:
{
  "issues": [
    {
      "severity": "error" or "warning",
      "category": "short category name",
      "message": "specific issue description under 100 chars",
      "fix": "specific fix suggestion under 80 chars"
    }
  ],
  "summary": "one sentence overall assessment"
}

Return {"issues": [], "summary": "No anomalies detected."} if everything looks correct.`,
        },
        {
          role: 'user',
          content: `Period: ${body.period}
Business state: ${body.businessState}
Total taxable: ₹${body.totalTaxable.toLocaleString('en-IN')}
Total tax: ₹${body.totalTax.toLocaleString('en-IN')}

B2B Entries (${body.b2bEntries.length} total, showing first 20):
${b2bSummary || 'None'}

HSN Summary:
${hsnSummaryText || 'None'}

B2C Totals: Taxable ₹${body.b2cTotals.taxableValue}, IGST ₹${body.b2cTotals.igst}`,
        },
      ],
    })

    const raw = stripJsonFences(response.choices[0]?.message?.content ?? '{}')
    let parsed: { issues: AnomalyIssue[]; summary: string }
    try {
      const p = JSON.parse(raw)
      if (typeof p !== 'object' || p === null || !Array.isArray(p.issues)) throw new Error('Bad shape')
      parsed = p as { issues: AnomalyIssue[]; summary: string }
    } catch (parseErr) {
      console.error('[AI/gstr1-anomaly] Parse error:', parseErr)
      return Response.json({ error: 'Could not parse AI response' }, { status: 503 })
    }
    return Response.json(parsed)
  } catch (err) {
    console.error('[AI/gstr1-anomaly] Error:', err)
    return Response.json({ error: 'Could not analyze GSTR-1' }, { status: 503 })
  }
}
