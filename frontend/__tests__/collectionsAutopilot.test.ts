import { describe, expect, it, vi, beforeEach } from 'vitest'
import { approveCollectionsTask } from '@/lib/ai/autopilot/approvalActions'
import { evaluateCollectionsAutopilot, DEFAULT_COLLECTIONS_AUTOPILOT_SETTINGS } from '@/lib/ai/autopilot/collections'
import type { CollectionsAutopilotEvaluationRequest } from '@/types/autopilot'
import type { Invoice } from '@/types/invoice'
import type { Customer } from '@/types/customer'
import type { BusinessProfile, AppSettings } from '@/types/business'

const mockGenerateReminderDraft = vi.fn()

vi.mock('@/lib/ai/reminderDrafting', () => ({
  generateReminderDraft: (...args: unknown[]) => mockGenerateReminderDraft(...args),
}))

const baseProfile: BusinessProfile = {
  businessName: 'Invozen Traders',
  legalName: 'Invozen Traders',
  businessType: 'Sole Proprietor',
  industry: 'Retail',
  gstin: '',
  gstRegistrationType: 'unregistered',
  stateCode: '29',
  state: 'Karnataka',
  filingFrequency: 'monthly',
  panNumber: '',
  tanNumber: null,
  phone: '9876543210',
  email: 'owner@example.com',
  billingAddress: {
    line1: 'Line 1',
    line2: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    stateCode: '29',
    pincode: '560001',
  },
  logoUrl: null,
  signatureUrl: null,
  branches: [],
}

const baseSettings: AppSettings = {
  invoiceSettings: {
    invoicePrefix: 'INV',
    invoiceStartNumber: 1,
    currentCounter: 10,
    duePeriodDays: 30,
    defaultTemplate: 'standard',
    footerNote: '',
    termsAndConditions: '',
    showBankDetails: false,
    showUpiQr: false,
  },
  bankDetails: {
    bankName: '',
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  },
  whatsappNumber: '9876543210',
  defaultGstRate: 18,
  razorpayConnected: false,
  currentBankBalance: 0,
  cashAlertThreshold: 50000,
  notificationSettings: [],
}

const baseCustomer: Customer = {
  id: 'cust-1',
  name: 'Acme Stores',
  businessName: 'Acme Stores',
  contactPerson: null,
  email: 'billing@acme.test',
  phone: '9876543210',
  gstin: null,
  gstinState: null,
  gstinStateCode: null,
  businessType: 'b2b',
  billingAddress: {
    line1: 'Road 1',
    line2: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    stateCode: '29',
    pincode: '560001',
  },
  shippingAddress: null,
  creditLimit: 100000,
  paymentTermsDays: 30,
  totalInvoiced: 0,
  totalPaid: 0,
  notes: null,
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
}

function buildInvoice(partial: Partial<Invoice>): Invoice {
  return {
    id: partial.id ?? 'inv-1',
    invoiceNumber: partial.invoiceNumber ?? 'INV-001',
    invoiceType: 'tax_invoice',
    status: partial.status ?? 'sent',
    customerId: partial.customerId ?? baseCustomer.id,
    customerSnapshot: partial.customerSnapshot ?? {
      name: baseCustomer.name,
      gstin: null,
      address: 'Road 1',
      state: 'Karnataka',
      stateCode: '29',
    },
    supplyType: 'intra',
    invoiceDate: partial.invoiceDate ?? '2026-06-01',
    dueDate: partial.dueDate ?? '2026-06-16',
    lineItems: [],
    subtotal: 1000,
    discountAmount: 0,
    taxableValue: 1000,
    cgstTotal: 90,
    sgstTotal: 90,
    igstTotal: 0,
    cessTotal: 0,
    totalTax: 180,
    grandTotal: partial.grandTotal ?? 1180,
    amountPaid: partial.amountPaid ?? 0,
    balanceDue: partial.balanceDue ?? 1180,
    notes: '',
    terms: '',
    placeOfSupply: 'Karnataka',
    irnNumber: null,
    irnStatus: null,
    tdsSection: null,
    tdsRate: null,
    tdsAmount: null,
    amendedInvoiceId: null,
    amendedInvoiceNumber: null,
    amendmentReason: null,
    currency: 'INR',
    exchangeRate: 1,
    attachmentIds: [],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  }
}

function buildRequest(overrides?: Partial<CollectionsAutopilotEvaluationRequest>): CollectionsAutopilotEvaluationRequest {
  return {
    snapshot: {
      invoices: [buildInvoice({})],
      customers: [baseCustomer],
      payments: [],
      profile: baseProfile,
      settings: baseSettings,
    },
    settings: DEFAULT_COLLECTIONS_AUTOPILOT_SETTINGS,
    approvalTasks: [],
    reminderHistory: [],
    triggeredBy: 'manual_refresh',
    now: '2026-06-13T08:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGenerateReminderDraft.mockResolvedValue({ message: 'Mock reminder draft', source: 'ai' })
})

describe('collections autopilot evaluator', () => {
  it('queues a due-soon first reminder approval instead of sending automatically', async () => {
    const result = await evaluateCollectionsAutopilot(buildRequest())

    expect(result.approvalTasks).toHaveLength(1)
    expect(result.approvalTasks[0].status).toBe('queued')
    expect(result.approvalTasks[0].decisionType).toBe('send_first_reminder')
    expect(result.run.metrics.queued).toBe(1)
  })

  it('escalates a high-value overdue invoice for manual review', async () => {
    const overdueInvoice = buildInvoice({
      dueDate: '2026-05-30',
      status: 'overdue',
      balanceDue: 125000,
      grandTotal: 125000,
    })

    const result = await evaluateCollectionsAutopilot(buildRequest({
      snapshot: {
        invoices: [overdueInvoice],
        customers: [baseCustomer],
        payments: [],
        profile: baseProfile,
        settings: baseSettings,
      },
      reminderHistory: [
        {
          id: 'r1',
          invoiceId: overdueInvoice.id,
          invoiceNumber: overdueInvoice.invoiceNumber,
          customerId: baseCustomer.id,
          customerName: baseCustomer.name,
          phone: '9876543210',
          sentAt: '2026-06-01T10:00:00.000Z',
          amount: overdueInvoice.balanceDue,
          daysOverdue: 3,
          channel: 'whatsapp',
        },
      ],
    }))

    expect(result.approvalTasks[0].status).toBe('escalated')
    expect(['hold_manual_review', 'escalate_high_risk_account']).toContain(result.approvalTasks[0].decisionType)
  })

  it('never queues a paid invoice', async () => {
    const paidInvoice = buildInvoice({
      status: 'paid',
      amountPaid: 1180,
      balanceDue: 0,
    })

    const result = await evaluateCollectionsAutopilot(buildRequest({
      snapshot: {
        invoices: [paidInvoice],
        customers: [baseCustomer],
        payments: [],
        profile: baseProfile,
        settings: baseSettings,
      },
    }))

    expect(result.approvalTasks).toHaveLength(0)
    expect(result.run.metrics.queued).toBe(0)
  })

  it('suppresses a recently reminded invoice during cooldown', async () => {
    const result = await evaluateCollectionsAutopilot(buildRequest({
      reminderHistory: [
        {
          id: 'recent-reminder',
          invoiceId: 'inv-1',
          invoiceNumber: 'INV-001',
          customerId: baseCustomer.id,
          customerName: baseCustomer.name,
          phone: '9876543210',
          sentAt: '2026-06-12T08:00:00.000Z',
          amount: 1180,
          daysOverdue: 0,
          channel: 'whatsapp',
        },
      ],
    }))

    expect(result.approvalTasks).toHaveLength(0)
    expect(result.logs.some((log) => log.message.includes('cooldown'))).toBe(true)
  })

  it('does not re-queue when a task is snoozed into the future', async () => {
    const result = await evaluateCollectionsAutopilot(buildRequest({
      approvalTasks: [
        {
          id: 'task-1',
          fingerprint: 'collections:inv-1:send_first_reminder',
          workflow: 'collections',
          status: 'snoozed',
          invoiceId: 'inv-1',
          invoiceNumber: 'INV-001',
          customerId: baseCustomer.id,
          customerName: baseCustomer.name,
          customerPhone: '9876543210',
          amount: 1180,
          proposedChannel: 'whatsapp',
          proposedSendAt: '2026-06-15T09:00:00.000Z',
          draftMessage: 'Existing draft',
          reason: 'Existing task',
          confidence: 'medium',
          escalationLevel: 'none',
          priorReminderCount: 0,
          paymentRiskScore: 40,
          paymentRiskSummary: 'Existing risk summary',
          sourceRunId: 'run-1',
          decisionType: 'send_first_reminder',
          createdAt: '2026-06-12T00:00:00.000Z',
          updatedAt: '2026-06-12T00:00:00.000Z',
          snoozedUntil: '2026-06-16T00:00:00.000Z',
          resolutionNote: null,
        },
      ],
    }))

    expect(result.approvalTasks).toHaveLength(0)
  })

  it('falls back to deterministic copy when AI drafting fails', async () => {
    mockGenerateReminderDraft.mockResolvedValue({
      message: 'Namaste Acme Stores ji,\n\nThis is a reminder from Invozen Traders for invoice INV-001.',
      source: 'fallback',
    })

    const result = await evaluateCollectionsAutopilot(buildRequest())

    expect(result.approvalTasks[0].draftMessage).toContain('Namaste Acme Stores ji')
    expect(result.logs.some((log) => log.type === 'ai_fallback')).toBe(true)
  })
})

describe('collections approval actions', () => {
  it('returns reminder history data when an approval is completed', () => {
    const task = {
      id: 'task-approve',
      fingerprint: 'collections:inv-1:send_first_reminder',
      workflow: 'collections',
      status: 'queued',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-001',
      customerId: baseCustomer.id,
      customerName: baseCustomer.name,
      customerPhone: '9876543210',
      amount: 1180,
      proposedChannel: 'whatsapp',
      proposedSendAt: '2026-06-13T09:00:00.000Z',
      draftMessage: 'Mock reminder draft',
      reason: 'Due soon',
      confidence: 'medium',
      escalationLevel: 'none',
      priorReminderCount: 0,
      paymentRiskScore: 40,
      paymentRiskSummary: '40% chance within 30 days',
      sourceRunId: 'run-1',
      decisionType: 'send_first_reminder',
      createdAt: '2026-06-13T08:00:00.000Z',
      updatedAt: '2026-06-13T08:00:00.000Z',
      snoozedUntil: null,
      resolutionNote: null,
    } as const

    const result = approveCollectionsTask(task)

    expect(result.task.status).toBe('completed')
    expect(result.reminderRecord?.invoiceId).toBe(task.invoiceId)
    expect(result.log.type).toBe('task_completed')
  })
})
