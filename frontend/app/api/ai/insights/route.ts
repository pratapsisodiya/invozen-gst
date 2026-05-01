import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

interface InsightsRequest {
  period: { month: number; year: number; label: string }
  gstr1: {
    b2bCount: number
    b2bTaxable: number
    b2csTaxable: number
    totalTaxable: number
    totalTax: number
    hsnCount: number
    topHsn: Array<{ hsn: string; taxable: number }>
  }
  gstr3b: {
    interStateTaxable: number
    intraStateTaxable: number
    totalOutput: number
    netItc: number
    netPayable: number
  }
  business: {
    name: string
    gstin: string
    filingFrequency: string
  }
}

interface InsightsResponse {
  insights: string[]
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  let body: InsightsRequest
  try {
    body = await req.json() as InsightsRequest
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const summary = `Business: ${body.business.name} (${body.business.gstin || 'unregistered'}, ${body.business.filingFrequency} filing)
Period: ${body.period.label}

GSTR-1:
- B2B supplies: ${body.gstr1.b2bCount} invoices, taxable ₹${body.gstr1.b2bTaxable.toLocaleString('en-IN')}
- B2CS taxable: ₹${body.gstr1.b2csTaxable.toLocaleString('en-IN')}
- Total taxable: ₹${body.gstr1.totalTaxable.toLocaleString('en-IN')}
- Total tax: ₹${body.gstr1.totalTax.toLocaleString('en-IN')}
- Distinct HSN/SAC codes used: ${body.gstr1.hsnCount}
- Top HSN: ${body.gstr1.topHsn.slice(0, 3).map((h) => `${h.hsn} (₹${h.taxable.toLocaleString('en-IN')})`).join(', ')}

GSTR-3B:
- Inter-state supplies: ₹${body.gstr3b.interStateTaxable.toLocaleString('en-IN')}
- Intra-state supplies: ₹${body.gstr3b.intraStateTaxable.toLocaleString('en-IN')}
- Total output tax: ₹${body.gstr3b.totalOutput.toLocaleString('en-IN')}
- Net ITC: ₹${body.gstr3b.netItc.toLocaleString('en-IN')}
- Net GST payable: ₹${body.gstr3b.netPayable.toLocaleString('en-IN')}`

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are an Indian GST compliance expert. Analyze the GST report data and return 4-6 concise bullet-point insights. Focus on:
1. Compliance risks (missing HSN codes, high inter-state ratio, filing deadline)
2. ITC optimization opportunities
3. Notable trends or anomalies in the data
4. Actionable recommendations

Return ONLY valid JSON: {"insights": ["insight 1", "insight 2", ...]}
Each insight must be one sentence, under 120 characters, actionable.
Do not include markdown or any text outside the JSON.`,
      messages: [{ role: 'user', content: summary }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text.trim()) as InsightsResponse
    return Response.json(parsed)
  } catch {
    return Response.json({ error: 'Could not generate insights' }, { status: 503 })
  }
}
