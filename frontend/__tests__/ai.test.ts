import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as validatePOST } from '../app/api/ai/validate/route'
import { POST as insightsPOST } from '../app/api/ai/insights/route'
import { POST as chatPOST } from '../app/api/ai/chat/route'

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({
    userId: 'user_test_123',
    getToken: vi.fn().mockResolvedValue('token_123'),
  }),
}))

// Mock rate limiting
vi.mock('@/lib/rateLimit', () => ({
  rateLimitAI: vi.fn().mockReturnValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: new Date(),
  }),
}))

// Mock Groq SDK
const mockCreateChatCompletionGroq = vi.fn()
vi.mock('groq-sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: mockCreateChatCompletionGroq,
          },
        },
      }
    }),
  }
})

// Mock OpenAI SDK (AzureOpenAI)
const mockCreateChatCompletionOpenAI = vi.fn()
vi.mock('openai', () => {
  return {
    AzureOpenAI: vi.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: mockCreateChatCompletionOpenAI,
          },
        },
      }
    }),
  }
})

describe('AI Route Handlers', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('POST /api/ai/validate', () => {
    it('returns 503 if GROQ_API_KEY is missing', async () => {
      delete process.env.GROQ_API_KEY
      const req = new NextRequest('http://localhost:3000/api/ai/validate', {
        method: 'POST',
        body: JSON.stringify({ lineItems: [], customerType: 'b2b', invoiceType: 'tax' }),
      })
      const res = await validatePOST(req)
      expect(res.status).toBe(503)
      const data = await res.json()
      expect(data.error).toBe('AI not configured')
    })

    it('returns warnings correctly on successful AI response', async () => {
      process.env.GROQ_API_KEY = 'gsk_mock_key'
      mockCreateChatCompletionGroq.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"warnings": ["HSN code is missing for product A"]}',
            },
          },
        ],
      })

      const req = new NextRequest('http://localhost:3000/api/ai/validate', {
        method: 'POST',
        body: JSON.stringify({
          lineItems: [{ description: 'product A', hsnSac: '', gstRate: 18, discountPercent: 0, rate: 100 }],
          customerType: 'b2b',
          invoiceType: 'tax',
        }),
      })

      const res = await validatePOST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.warnings).toEqual(['HSN code is missing for product A'])
    })
  })

  describe('POST /api/ai/insights', () => {
    it('returns 503 if GROQ_API_KEY is missing', async () => {
      delete process.env.GROQ_API_KEY
      const req = new NextRequest('http://localhost:3000/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const res = await insightsPOST(req)
      expect(res.status).toBe(503)
    })

    it('returns insights list on successful AI response', async () => {
      process.env.GROQ_API_KEY = 'gsk_mock_key'
      mockCreateChatCompletionGroq.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"insights": ["High inter-state supply ratio detected.", "ITC claim has been optimized."]}',
            },
          },
        ],
      })

      const req = new NextRequest('http://localhost:3000/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({
          period: { month: 1, year: 2026, label: 'Jan 2026' },
          gstr1: { b2bCount: 1, b2bTaxable: 100, b2csTaxable: 200, totalTaxable: 300, totalTax: 54, hsnCount: 1, topHsn: [] },
          gstr3b: { interStateTaxable: 100, intraStateTaxable: 200, totalOutput: 54, netItc: 10, netPayable: 44 },
          business: { name: 'Test Business', gstin: '29ABCDE1234F1Z5', filingFrequency: 'monthly' },
        }),
      })

      const res = await insightsPOST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.insights).toEqual([
        'High inter-state supply ratio detected.',
        'ITC claim has been optimized.',
      ])
    })
  })

  describe('POST /api/ai/chat', () => {
    it('returns 503 if Azure OpenAI endpoint/key is missing', async () => {
      delete process.env.AZURE_OPENAI_API_KEY
      const req = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'hello', context: {}, history: [] }),
      })
      const res = await chatPOST(req)
      expect(res.status).toBe(503)
    })

    it('returns a readable stream for chat chunks', async () => {
      process.env.AZURE_OPENAI_API_KEY = 'mock_key'
      process.env.AZURE_OPENAI_ENDPOINT = 'https://mock.openai.azure.com'
      
      // Mock the async generator for stream response
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'Hello' } }] }
          yield { choices: [{ delta: { content: ' there!' } }] }
        }
      }
      mockCreateChatCompletionOpenAI.mockResolvedValue(mockStream)

      const req = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'hello',
          context: {
            businessName: 'Test Business',
            gstin: '',
            state: 'Karnataka',
            filingFrequency: 'monthly',
            revenue: 0,
            outstanding: 0,
            overdue: 0,
            overdueCount: 0,
            sentCount: 0,
            gstCollected: 0,
            itcAvailable: 0,
            itcClaimed: 0,
            itcPending: 0,
            totalInvoices: 0,
            totalCustomers: 0,
          },
          history: [],
        }),
      })

      const res = await chatPOST(req)
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/plain')
      
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let resultText = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          resultText += decoder.decode(value)
        }
      }
      expect(resultText).toBe('Hello there!')
    })
  })
})
