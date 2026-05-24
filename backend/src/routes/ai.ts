import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { ok, badRequest } from '../lib/response.js'
import { z } from 'zod'
import { Groq } from 'groq-sdk'
import { config } from '../config.js'

const router = Router()
router.use(requireAuth)

// Initialize Groq client
const groq = new Groq({ apiKey: config.GROQ_API_KEY })

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

    if (!config.GROQ_API_KEY) {
      return badRequest(res, 'AI service not configured (GROQ_API_KEY missing)')
    }

    const completion = await groq.chat.completions.create({
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
      model: 'llama3-8b-8192',
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

    if (!config.GROQ_API_KEY) {
      return badRequest(res, 'AI service not configured (GROQ_API_KEY missing)')
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

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert AI assistant that drafts concise client communications for Chartered Accountants in India.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama3-8b-8192'
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

    if (!config.GROQ_API_KEY) {
      return badRequest(res, 'AI service not configured (GROQ_API_KEY missing)')
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

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert AI compliance analyst for Indian GST.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama3-8b-8192'
    })

    const analysis = completion.choices[0]?.message?.content
    
    ok(res, { riskAnalysis: analysis })
  } catch (err) {
    next(err)
  }
})

export default router
