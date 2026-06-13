import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { ok, badRequest } from '../lib/response'
import { z } from 'zod'
import OpenAI, { AzureOpenAI } from 'openai'
import { config } from '../config'

const router = Router()
router.use(requireAuth)

// Initialize AI clients
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })
const azureOpenai = new AzureOpenAI({
  apiKey: config.AZURE_OPENAI_API_KEY,
  endpoint: config.AZURE_OPENAI_ENDPOINT,
  apiVersion: config.AZURE_OPENAI_API_VERSION,
  deployment: config.AZURE_DEPLOYMENT_NAME,
})

// Validation schema for communication draft
const draftSchema = z.object({
  clientId: z.string(),
  context: z.string().optional()
})

// POST /ai/extract-invoice - Extracts invoice details from text using Groq
router.post('/extract-invoice', async (req, res, next) => {
  try {
    const { text } = req.body
    if (!text) {
      return badRequest(res, 'Missing invoice text')
    }

    if (!config.AZURE_OPENAI_API_KEY) {
      return badRequest(res, 'AI service not configured (AZURE_OPENAI_API_KEY missing)')
    }

    const completion = await azureOpenai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant specialized in parsing Indian GST invoices. Extract the following fields as a JSON object: vendorName, vendorGstin, invoiceNumber, date, totalAmount, gstAmount, taxBreakup (CGST, SGST, IGST), and placeOfSupply. Return ONLY the JSON object.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini',
      response_format: { type: 'json_object' }
    })

    const result = completion.choices[0]?.message?.content
    if (!result) throw new Error('No result from AI')

    ok(res, { extractedData: JSON.parse(result) })
  } catch (err) {
    next(err)
  }
})

// POST /ai/draft-communication - Drafts a WhatsApp/Email message for a client
router.post('/draft-communication', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { clientId, context } = draftSchema.parse(req.body)

    if (!config.AZURE_OPENAI_API_KEY) {
      return badRequest(res, 'AI service not configured (AZURE_OPENAI_API_KEY missing)')
    }

    // Get client data
    const client = await prisma.cAClient.findFirst({
      where: { id: clientId, userId }
    })

    if (!client) {
      return badRequest(res, 'Client not found')
    }

    const clientData = client.data as any
    const businessName = clientData.businessName || 'Client'

    const prompt = `Draft a professional WhatsApp message from a Chartered Accountant to their client "${businessName}". 
Context/Topic: ${context || 'Reminder to send documents for GST filing before the 10th of the month.'}
Make it polite, brief, clear, and actionable. Do not include any placeholder brackets (like [Your Name]), assume it will be sent directly.`

    const completion = await azureOpenai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert AI assistant that drafts concise client communications for Chartered Accountants in India.' },
        { role: 'user', content: prompt }
      ],
      model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini'
    })

    const draft = completion.choices[0]?.message?.content
    
    ok(res, { draft })
  } catch (err) {
    next(err)
  }
})

// GET /ai/risk-analysis/:clientId - Analyzes risk for a CA client
router.get('/risk-analysis/:clientId', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { clientId } = req.params

    if (!config.AZURE_OPENAI_API_KEY) {
      return badRequest(res, 'AI service not configured (AZURE_OPENAI_API_KEY missing)')
    }

    // Fetch client
    const client = await prisma.cAClient.findFirst({
      where: { id: clientId, userId }
    })

    if (!client) return badRequest(res, 'Client not found')
      
    // Fetch last filing record (mock logic for context)
    const filing = await prisma.filingRecord.findFirst({
      where: { userId }, // In a real setup, we'd query by clientId or client GSTIN
      orderBy: { createdAt: 'desc' }
    })

    const clientData = client.data as any
    const filingContext = filing ? `Last filing status: ${(filing.data as any).status || 'Unknown'} for period ${(filing.data as any).period}` : 'No recent filing records found.'

    const prompt = `Analyze compliance risk for CA client "${clientData.businessName}". 
GSTIN: ${clientData.gstin || 'Not provided'}
Filing Frequency: ${clientData.filingFrequency || 'monthly'}. 
${filingContext}
Current Date: ${new Date().toISOString()}

Identify any missing document risks, late fee risks, or compliance warnings. Return a concise risk summary in 2-3 short bullet points.`

    const completion = await azureOpenai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert AI compliance analyst for Indian GST.' },
        { role: 'user', content: prompt }
      ],
      model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini'
    })

    const analysis = completion.choices[0]?.message?.content
    
    ok(res, { riskAnalysis: analysis })
  } catch (err) {
    next(err)
  }
})

// POST /ai/chat - Conversational GST assistant with live business context from DB
router.post('/chat', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    if (!config.AZURE_OPENAI_API_KEY) {
      return badRequest(res, 'AI service not configured (AZURE_OPENAI_API_KEY missing)')
    }

    const { messages } = req.body as { messages: { role: 'user' | 'assistant'; content: string }[] }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return badRequest(res, 'messages array is required')
    }

    // Pull live business context from database
    const [invoices, customers, purchases] = await Promise.all([
      prisma.invoice.findMany({ where: { userId }, select: { data: true } }),
      prisma.customer.findMany({ where: { userId }, select: { data: true } }),
      prisma.purchaseInvoice.findMany({ where: { userId }, select: { data: true } }),
    ])

    const invoiceData = invoices.map((i) => i.data as any)
    const totalRevenue = invoiceData
      .filter((i) => i.status === 'paid')
      .reduce((s: number, i: any) => s + (i.grandTotal || 0), 0)
    const outstanding = invoiceData
      .filter((i) => ['sent', 'overdue'].includes(i.status))
      .reduce((s: number, i: any) => s + (i.balanceDue || 0), 0)
    const gstCollected = invoiceData
      .filter((i) => i.status === 'paid')
      .reduce((s: number, i: any) => s + (i.totalTax || 0), 0)
    const overdueCount = invoiceData.filter((i: any) => i.status === 'overdue').length
    const itcAvailable = (purchases.map((p) => p.data as any))
      .reduce((s: number, p: any) => s + (p.eligibleItc || 0), 0)

    const systemPrompt = `You are an expert GST and business finance assistant for Indian small businesses using Invozen GST software.

LIVE BUSINESS DATA (as of today):
- Total invoices: ${invoices.length}
- Paid revenue: ₹${totalRevenue.toLocaleString('en-IN')}
- Outstanding receivables: ₹${outstanding.toLocaleString('en-IN')}
- GST collected: ₹${gstCollected.toLocaleString('en-IN')}
- Overdue invoices: ${overdueCount}
- Total customers: ${customers.length}
- Available ITC: ₹${itcAvailable.toLocaleString('en-IN')}

You help with: GST calculations, GSTR-1/3B filing, ITC claims, invoice compliance, payment follow-ups, and business insights.
Answer concisely. Use Indian numbering (lakhs, crores). Always be practical and actionable.`

    const completion = await azureOpenai.chat.completions.create({
      model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1024,
    })

    const reply = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.'

    ok(res, {
      reply,
      context: {
        invoiceCount: invoices.length,
        totalRevenue,
        outstanding,
        gstCollected,
        overdueCount,
        customerCount: customers.length,
        itcAvailable,
      },
    })
  } catch (err) {
    next(err)
  }
})

// POST /ai/insights - AI-generated business intelligence from real DB data
router.post('/insights', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    if (!config.AZURE_OPENAI_API_KEY) {
      return badRequest(res, 'AI service not configured (AZURE_OPENAI_API_KEY missing)')
    }

    const [invoices, customers, purchases] = await Promise.all([
      prisma.invoice.findMany({ where: { userId }, select: { data: true } }),
      prisma.customer.findMany({ where: { userId }, select: { data: true } }),
      prisma.purchaseInvoice.findMany({ where: { userId }, select: { data: true } }),
    ])

    const invoiceData = invoices.map((i) => i.data as any)
    const now = new Date()
    const thisMonth = invoiceData.filter((i: any) => {
      const d = new Date(i.invoiceDate || '')
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    const totalRevenue = invoiceData.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.grandTotal || 0), 0)
    const outstanding = invoiceData.filter((i: any) => ['sent', 'overdue'].includes(i.status)).reduce((s: number, i: any) => s + (i.balanceDue || 0), 0)
    const gstThisMonth = thisMonth.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.totalTax || 0), 0)
    const overdueInvoices = invoiceData.filter((i: any) => i.status === 'overdue')
    const itcAvailable = purchases.map((p) => p.data as any).reduce((s: number, p: any) => s + (p.eligibleItc || 0), 0)

    // Top customers by revenue
    const customerRevMap: Record<string, number> = {}
    invoiceData.filter((i: any) => i.status === 'paid').forEach((i: any) => {
      if (i.customerName) customerRevMap[i.customerName] = (customerRevMap[i.customerName] || 0) + (i.grandTotal || 0)
    })
    const topCustomers = Object.entries(customerRevMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, revenue]) => ({ name, revenue }))

    const businessContext = `
Business snapshot:
- Total invoices: ${invoices.length}, Customers: ${customers.length}
- Total revenue (paid): ₹${totalRevenue.toLocaleString('en-IN')}
- Outstanding: ₹${outstanding.toLocaleString('en-IN')}
- GST liability this month: ₹${gstThisMonth.toLocaleString('en-IN')}
- Overdue invoices: ${overdueInvoices.length} worth ₹${overdueInvoices.reduce((s: number, i: any) => s + (i.balanceDue || 0), 0).toLocaleString('en-IN')}
- Available ITC: ₹${itcAvailable.toLocaleString('en-IN')}
- Top customers: ${topCustomers.map((c) => `${c.name} (₹${c.revenue.toLocaleString('en-IN')})`).join(', ') || 'None'}
- This month invoices: ${thisMonth.length}`

    const completion = await azureOpenai.chat.completions.create({
      model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst for Indian SMBs. Analyze business data and return a JSON object with: { score: number (0-100 health score), insights: [{category: string, title: string, detail: string, priority: "high"|"medium"|"low"}] (4-6 insights), recommendations: [string] (3 actionable recommendations) }. Return ONLY valid JSON.',
        },
        { role: 'user', content: `Analyze this business and return insights JSON:\n${businessContext}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1024,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    ok(res, {
      ...parsed,
      topCustomers,
      generatedAt: new Date().toISOString(),
      dataContext: { invoiceCount: invoices.length, totalRevenue, outstanding, gstThisMonth, itcAvailable },
    })
  } catch (err) {
    next(err)
  }
})

// POST /ai/invoice-assistant - Natural language → structured invoice
router.post('/invoice-assistant', async (req, res, next) => {
  try {
    if (!config.AZURE_OPENAI_API_KEY) {
      return badRequest(res, 'AI service not configured (AZURE_OPENAI_API_KEY missing)')
    }

    const { description } = req.body as { description: string }
    if (!description?.trim()) {
      return badRequest(res, 'description is required')
    }

    const completion = await azureOpenai.chat.completions.create({
      model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are an Indian GST invoice assistant. Parse a natural language invoice description and return a JSON object with:
{
  "customerHint": "customer name extracted",
  "lineItems": [
    { "description": "item description", "hsn": "HSN/SAC code (4-8 digits)", "quantity": number, "unit": "NOS|HRS|KGS|MTR|SQM|SET|PCS", "rate": number, "gstRate": 0|5|12|18|28 }
  ],
  "notes": "any additional notes from description",
  "totalEstimate": number
}
Use correct HSN/SAC codes for Indian goods/services. For software/IT services use SAC 998314. For consulting use SAC 998312. Return ONLY valid JSON.`,
        },
        { role: 'user', content: description },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 512,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    ok(res, JSON.parse(raw))
  } catch (err) {
    next(err)
  }
})

// POST /ai/hsn-lookup - HSN/SAC code lookup with GST rate
router.post('/hsn-lookup', async (req, res, next) => {
  try {
    if (!config.AZURE_OPENAI_API_KEY) {
      return badRequest(res, 'AI service not configured (AZURE_OPENAI_API_KEY missing)')
    }

    const { productDescription } = req.body as { productDescription: string }
    if (!productDescription?.trim()) {
      return badRequest(res, 'productDescription is required')
    }

    const completion = await azureOpenai.chat.completions.create({
      model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an Indian GST HSN/SAC code expert. Return a JSON object: { "hsn": "code", "description": "official HSN/SAC description", "gstRate": 0|5|12|18|28, "category": "goods|services", "notes": "brief compliance note" }. Return ONLY valid JSON.',
        },
        { role: 'user', content: `Find HSN/SAC code for: ${productDescription}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 256,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    ok(res, JSON.parse(raw))
  } catch (err) {
    next(err)
  }
})

// POST /ai/agent - Tool-enabled agent (simple LangChain-like loop)
router.post('/agent', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    if (!config.AZURE_OPENAI_API_KEY) {
      return badRequest(res, 'AI service not configured (AZURE_OPENAI_API_KEY missing)')
    }

    const { messages } = req.body as { messages: { role: 'user' | 'assistant' | 'system'; content: string }[] }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return badRequest(res, 'messages array is required')
    }

    // Define available tools
    async function tool_db_query(args: { query: string }) {
      // Support simple queries: invoices_summary, customers_list, purchases_summary
      if (args.query === 'invoices_summary') {
        const invoices = await prisma.invoice.findMany({ where: { userId }, select: { data: true } })
        const invoiceData = invoices.map((i) => i.data as any)
        const totalRevenue = invoiceData.filter((i) => i.status === 'paid').reduce((s: number, i: any) => s + (i.grandTotal || 0), 0)
        const outstanding = invoiceData.filter((i: any) => ['sent', 'overdue'].includes(i.status)).reduce((s: number, i: any) => s + (i.balanceDue || 0), 0)
        return { totalRevenue, outstanding, invoiceCount: invoices.length }
      }
      if (args.query === 'customers_list') {
        const customers = await prisma.customer.findMany({ where: { userId }, select: { data: true } })
        return { customers: customers.map((c) => (c.data as any).businessName || (c.data as any).name || 'Unnamed') }
      }
      if (args.query === 'purchases_summary') {
        const purchases = await prisma.purchaseInvoice.findMany({ where: { userId }, select: { data: true } })
        const purchaseData = purchases.map((p) => p.data as any)
        const itcAvailable = purchaseData.reduce((s: number, p: any) => s + (p.eligibleItc || 0), 0)
        return { purchaseCount: purchases.length, itcAvailable }
      }
      return { error: 'Unknown db query' }
    }

    async function tool_hsn_lookup(args: { description: string }) {
      // Reuse the same prompt used in /hsn-lookup endpoint
      const completion = await azureOpenai.chat.completions.create({
        model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'You are an Indian GST HSN/SAC code expert. Return a JSON object: { "hsn": "code", "description": "official HSN/SAC description", "gstRate": 0|5|12|18|28, "category": "goods|services", "notes": "brief compliance note" }.' },
          { role: 'user', content: `Find HSN/SAC code for: ${args.description}` },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 256,
      })
      const raw = completion.choices[0]?.message?.content ?? '{}'
      return JSON.parse(raw)
    }

    async function tool_external_fetch(args: { url: string; method?: string }) {
      // Very simple, safe fetch wrapper. Restrict to GET and known hosts if needed.
      const method = (args.method || 'GET').toUpperCase()
      if (method !== 'GET') return { error: 'Only GET supported for external_fetch' }
      const resp = await fetch(args.url)
      const text = await resp.text()
      // Truncate large responses
      return { status: resp.status, body: text.slice(0, 3000) }
    }

    async function tool_invoice_generator(args: { description: string }) {
      // Call the invoice-assistant logic by invoking the same model prompt
      const completion = await azureOpenai.chat.completions.create({
        model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: `You are an Indian GST invoice assistant. Parse a natural language invoice description and return a JSON object with: { "customerHint": "customer name extracted", "lineItems": [ { "description": "item description", "hsn": "HSN/SAC code", "quantity": number, "unit": "NOS|HRS|PCS", "rate": number, "gstRate": 0|5|12|18|28 } ], "notes": "any additional notes", "totalEstimate": number } Return ONLY valid JSON.` },
          { role: 'user', content: args.description },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 512,
      })
      const raw = completion.choices[0]?.message?.content ?? '{}'
      return JSON.parse(raw)
    }

    // Agent loop: ask model for a tool call (JSON), execute tool, feed result back, then ask for final answer.
    const toolSystem = `You are an agent with access to tools: db_query(args), hsn_lookup(args), external_fetch(args), invoice_generator(args). When you want to use a tool, reply with a JSON object exactly like: {"tool": "tool_name", "args": { ... }}. After the tool returns, you will receive its result and should then either call another tool or return a final answer as {"final": "your answer text"}. Do not output any other text.`

    // Initial model call
    const initial = await azureOpenai.chat.completions.create({
      model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: toolSystem },
        ...messages,
      ],
      max_tokens: 1024,
    })

    let replyText = initial.choices[0]?.message?.content ?? ''

    // Try to parse JSON tool call
    let parsed: any = null
    try { parsed = JSON.parse(replyText) } catch (e) { /* not JSON */ }

    let loopCount = 0
    while (parsed && parsed.tool && loopCount < 3) {
      loopCount++
      let toolResult: any = { error: 'Unknown tool' }
      try {
        const { tool, args } = parsed
        if (tool === 'db_query') toolResult = await tool_db_query(args)
        else if (tool === 'hsn_lookup') toolResult = await tool_hsn_lookup(args)
        else if (tool === 'external_fetch') toolResult = await tool_external_fetch(args)
        else if (tool === 'invoice_generator') toolResult = await tool_invoice_generator(args)
      } catch (err) {
        toolResult = { error: String(err) }
      }

      // Feed tool result back to model and ask for final answer
      const follow = await azureOpenai.chat.completions.create({
        model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: toolSystem },
          ...messages,
          { role: 'assistant', content: JSON.stringify(parsed) },
          { role: 'user', content: 'Tool result: ' + JSON.stringify(toolResult) },
        ],
        max_tokens: 1024,
      })

      replyText = follow.choices[0]?.message?.content ?? ''
      try { parsed = JSON.parse(replyText) } catch (e) { parsed = null }
      // If parsed is final object with { final: '...' } break
      if (parsed && parsed.final) break
    }

    // If model returned final answer JSON, extract final; otherwise use replyText
    let finalAnswer = ''
    try {
      const maybe = JSON.parse(replyText)
      if (maybe && maybe.final) finalAnswer = maybe.final
      else finalAnswer = replyText
    } catch {
      finalAnswer = replyText
    }

    ok(res, { reply: finalAnswer })
  } catch (err) {
    next(err)
  }
})

export default router
