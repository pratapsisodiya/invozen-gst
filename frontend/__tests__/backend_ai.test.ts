import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../backend/app'
import { prisma } from '../backend/lib/prisma'

// Mock config first before anything else imports it
vi.mock('../backend/config', () => {
  return {
    config: {
      PORT: 4000,
      DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock',
      CLERK_SECRET_KEY: 'mock_clerk_secret',
      FRONTEND_URL: 'http://localhost:3000',
      NODE_ENV: 'test',
      GROQ_API_KEY: 'mock_groq',
      AZURE_OPENAI_ENDPOINT: 'https://mock.openai.azure.com',
      AZURE_OPENAI_API_KEY: 'mock_azure_key',
      AZURE_OPENAI_API_VERSION: '2023-05-15',
      AZURE_DEPLOYMENT_NAME: 'gpt-4.1-mini',
      OPENAI_API_KEY: 'mock_openai',
    }
  }
})

// Mock requireAuth middleware
vi.mock('../backend/middleware/auth', () => {
  return {
    requireAuth: (req: any, res: any, next: any) => {
      req.userId = 'user_test_123'
      req.clerkUserId = 'clerk_test_123'
      req.role = 'owner'
      next()
    },
    clerkClient: {},
  }
})

// Mock rate limiting
vi.mock('../backend/middleware/rateLimit', () => {
  const mockLimiter = (req: any, res: any, next: any) => next()
  return {
    apiLimiter: mockLimiter,
    authLimiter: mockLimiter,
    irnLimiter: mockLimiter,
  }
})

// Mock Prisma
vi.mock('../backend/lib/prisma', () => {
  return {
    prisma: {
      cAClient: {
        findFirst: vi.fn(),
      },
      filingRecord: {
        findFirst: vi.fn(),
      },
      invoice: {
        findMany: vi.fn(),
      },
      customer: {
        findMany: vi.fn(),
      },
      purchaseInvoice: {
        findMany: vi.fn(),
      },
    },
    toJson: (v: any) => v,
  }
})

// Mock OpenAI SDK
const mockCreateChatCompletionOpenAI = vi.fn()
vi.mock('openai', () => {
  const mockCreate = (...args: any[]) => mockCreateChatCompletionOpenAI(...args)
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }
    }),
    AzureOpenAI: vi.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }
    }),
  }
})

describe('Express Backend AI Router', () => {
  const app = createApp()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/ai/extract-invoice', () => {
    it('returns bad request if text is missing', async () => {
      const res = await request(app)
        .post('/api/v1/ai/extract-invoice')
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Missing invoice text')
    })

    it('returns extracted data on success', async () => {
      const mockResult = JSON.stringify({
        vendorName: 'Acme Corp',
        vendorGstin: '29ABCDE1234F1Z5',
        invoiceNumber: 'INV-001',
        date: '2026-06-13',
        totalAmount: 118,
        gstAmount: 18,
        taxBreakup: { CGST: 9, SGST: 9, IGST: 0 },
        placeOfSupply: '29-Karnataka',
      })

      mockCreateChatCompletionOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: mockResult,
            },
          },
        ],
      })

      const res = await request(app)
        .post('/api/v1/ai/extract-invoice')
        .send({ text: 'Acme Corp invoice INV-001 for 118 rupees including 18% GST' })

      expect(res.status).toBe(200)
      expect(res.body.data.extractedData.vendorName).toBe('Acme Corp')
      expect(res.body.data.extractedData.totalAmount).toBe(118)
    })
  })

  describe('POST /api/v1/ai/draft-communication', () => {
    it('returns error if client not found', async () => {
      vi.mocked(prisma.cAClient.findFirst).mockResolvedValue(null as any)

      const res = await request(app)
        .post('/api/v1/ai/draft-communication')
        .send({ clientId: 'nonexistent', context: 'Test' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Client not found')
    })

    it('returns communication draft on success', async () => {
      vi.mocked(prisma.cAClient.findFirst).mockResolvedValue({
        id: 'client_123',
        userId: 'user_test_123',
        data: { businessName: 'Acme Corp', gstin: '29ABCDE1234F1Z5' },
      } as any)

      mockCreateChatCompletionOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Dear Acme Corp, please send your documents.',
            },
          },
        ],
      })

      const res = await request(app)
        .post('/api/v1/ai/draft-communication')
        .send({ clientId: 'client_123', context: 'Reminder' })

      expect(res.status).toBe(200)
      expect(res.body.data.draft).toBe('Dear Acme Corp, please send your documents.')
    })
  })

  describe('GET /api/v1/ai/risk-analysis/:clientId', () => {
    it('returns error if client not found', async () => {
      vi.mocked(prisma.cAClient.findFirst).mockResolvedValue(null as any)

      const res = await request(app)
        .get('/api/v1/ai/risk-analysis/nonexistent')

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Client not found')
    })

    it('returns risk analysis on success', async () => {
      vi.mocked(prisma.cAClient.findFirst).mockResolvedValue({
        id: 'client_123',
        userId: 'user_test_123',
        data: { businessName: 'Acme Corp', gstin: '29ABCDE1234F1Z5', filingFrequency: 'monthly' },
      } as any)
      vi.mocked(prisma.filingRecord.findFirst).mockResolvedValue({
        data: { status: 'Filed', period: 'May 2026' }
      } as any)

      mockCreateChatCompletionOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: '- Low risk\n- All filings up to date',
            },
          },
        ],
      })

      const res = await request(app)
        .get('/api/v1/ai/risk-analysis/client_123')

      expect(res.status).toBe(200)
      expect(res.body.data.riskAnalysis).toContain('Low risk')
    })
  })

  describe('POST /api/v1/ai/chat', () => {
    it('returns error if messages are missing', async () => {
      const res = await request(app)
        .post('/api/v1/ai/chat')
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('messages array is required')
    })

    it('returns chat reply and context', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { data: { status: 'paid', grandTotal: 1000, totalTax: 180 } },
        { data: { status: 'sent', balanceDue: 500 } }
      ] as any)
      vi.mocked(prisma.customer.findMany).mockResolvedValue([
        { data: { name: 'Cust 1' } }
      ] as any)
      vi.mocked(prisma.purchaseInvoice.findMany).mockResolvedValue([
        { data: { eligibleItc: 200 } }
      ] as any)

      mockCreateChatCompletionOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Your revenue is ₹1,000.',
            },
          },
        ],
      })

      const res = await request(app)
        .post('/api/v1/ai/chat')
        .send({ messages: [{ role: 'user', content: 'What is my revenue?' }] })

      expect(res.status).toBe(200)
      expect(res.body.data.reply).toBe('Your revenue is ₹1,000.')
      expect(res.body.data.context.totalRevenue).toBe(1000)
      expect(res.body.data.context.outstanding).toBe(500)
      expect(res.body.data.context.itcAvailable).toBe(200)
    })
  })

  describe('POST /api/v1/ai/insights', () => {
    it('returns parsed insights snapshot', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { data: { invoiceDate: '2026-06-01', status: 'paid', grandTotal: 1000, totalTax: 180, customerName: 'Customer A' } }
      ] as any)
      vi.mocked(prisma.customer.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.purchaseInvoice.findMany).mockResolvedValue([] as any)

      const mockInsightsResult = JSON.stringify({
        score: 95,
        insights: [{ category: 'Tax', title: 'Good health', detail: 'Filing looks good', priority: 'low' }],
        recommendations: ['Maintain current compliance flow']
      })

      mockCreateChatCompletionOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: mockInsightsResult,
            },
          },
        ],
      })

      const res = await request(app)
        .post('/api/v1/ai/insights')
        .send({})

      expect(res.status).toBe(200)
      expect(res.body.data.score).toBe(95)
      expect(res.body.data.insights[0].category).toBe('Tax')
      expect(res.body.data.topCustomers[0].name).toBe('Customer A')
    })
  })

  describe('POST /api/v1/ai/invoice-assistant', () => {
    it('returns parsed invoice details', async () => {
      const mockInvoiceAssistantResult = JSON.stringify({
        customerHint: 'Test Cust',
        lineItems: [{ description: 'Item 1', hsn: '998314', quantity: 1, unit: 'PCS', rate: 1000, gstRate: 18 }],
        notes: 'Test note',
        totalEstimate: 1180
      })

      mockCreateChatCompletionOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: mockInvoiceAssistantResult,
            },
          },
        ],
      })

      const res = await request(app)
        .post('/api/v1/ai/invoice-assistant')
        .send({ description: 'Create invoice for Test Cust for IT services rate 1000' })

      expect(res.status).toBe(200)
      expect(res.body.data.customerHint).toBe('Test Cust')
      expect(res.body.data.lineItems[0].hsn).toBe('998314')
    })
  })

  describe('POST /api/v1/ai/hsn-lookup', () => {
    it('returns official HSN code and description', async () => {
      const mockHsnResult = JSON.stringify({
        hsn: '998314',
        description: 'Information technology services',
        gstRate: 18,
        category: 'services',
        notes: 'SAC code for IT development'
      })

      mockCreateChatCompletionOpenAI.mockResolvedValue({
        choices: [
          {
            message: {
              content: mockHsnResult,
            },
          },
        ],
      })

      const res = await request(app)
        .post('/api/v1/ai/hsn-lookup')
        .send({ productDescription: 'Software programming' })

      expect(res.status).toBe(200)
      expect(res.body.data.hsn).toBe('998314')
      expect(res.body.data.gstRate).toBe(18)
    })
  })

  describe('POST /api/v1/ai/agent', () => {
    it('runs simple agent loop returning final reply', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { data: { status: 'paid', grandTotal: 2500 } }
      ] as any)

      // 1. Initial AI call requests db_query
      // 2. Follow-up AI call returns the final answer
      mockCreateChatCompletionOpenAI
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  tool: 'db_query',
                  args: { query: 'invoices_summary' }
                }),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  final: 'Your total revenue from paid invoices is ₹2,500.',
                }),
              },
            },
          ],
        })

      const res = await request(app)
        .post('/api/v1/ai/agent')
        .send({ messages: [{ role: 'user', content: 'What is my revenue?' }] })

      expect(res.status).toBe(200)
      expect(res.body.data.reply).toBe('Your total revenue from paid invoices is ₹2,500.')
    })
  })
})
