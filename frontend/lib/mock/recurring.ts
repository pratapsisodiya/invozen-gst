import type { RecurringTemplate, RecurringLog } from '../../types/recurring'
import type { LineItem } from '../../types/invoice'
import { calculateLineItem } from '../gst/calculator'

function makeRLine(
  id: string, itemId: string, description: string, hsnSac: string,
  quantity: number, unit: string, rate: number, discountPercent: number,
  gstRate: number, supplyType: 'intra' | 'inter'
): LineItem {
  const calc = calculateLineItem(quantity, rate, discountPercent, gstRate, supplyType)
  return { id, itemId, description, hsnSac, quantity, unit, rate, discountPercent, gstRate, ...calc }
}

export const mockRecurringTemplates: RecurringTemplate[] = [
  {
    id: 'rec-01',
    name: 'Monthly Cloud Retainer — Rekha IT',
    status: 'active',
    customerId: 'cust-08',
    customerSnapshot: { name: 'Ananya Das', gstin: '19AABCD8901H1Z9', address: '12 Park Street, Kolkata', state: 'West Bengal', stateCode: '19' },
    frequency: 'monthly',
    customDays: null,
    startDate: '2024-11-01',
    endDate: null,
    nextGenerationDate: '2025-03-01',
    autoSend: false,
    lineItems: [
      makeRLine('rli-01a', 'item-17', 'Software Development - Monthly', '998313', 40, 'HRS', 2500, 0, 18, 'inter'),
    ],
    notes: 'Monthly software development retainer',
    terms: 'Payment due within 15 days.',
    totalGenerated: 4,
    lastGeneratedAt: '2025-02-01T08:00:00Z',
    pausedReason: null,
    createdAt: '2024-10-25T10:00:00Z',
    updatedAt: '2025-02-01T08:00:00Z',
  },
  {
    id: 'rec-02',
    name: 'Quarterly CA Services — Deepa Iyer',
    status: 'active',
    customerId: 'cust-06',
    customerSnapshot: { name: 'Deepa Iyer', gstin: '33AABCI2345F1Z4', address: '23 Anna Salai, Chennai', state: 'Tamil Nadu', stateCode: '33' },
    frequency: 'quarterly',
    customDays: null,
    startDate: '2024-10-01',
    endDate: '2026-09-30',
    nextGenerationDate: '2025-04-01',
    autoSend: true,
    lineItems: [
      makeRLine('rli-02a', 'item-19', 'CA / Accounting Services - Quarterly', '998221', 1, 'NOS', 15000, 0, 18, 'inter'),
      makeRLine('rli-02b', 'item-20', 'GST Filing - Quarterly', '998221', 3, 'NOS', 2500, 0, 18, 'inter'),
    ],
    notes: 'Quarterly compliance package',
    terms: 'Payment due within 30 days.',
    totalGenerated: 2,
    lastGeneratedAt: '2025-01-01T08:00:00Z',
    pausedReason: null,
    createdAt: '2024-09-20T10:00:00Z',
    updatedAt: '2025-01-01T08:00:00Z',
  },
  {
    id: 'rec-03',
    name: 'Security Services — Menon Auto',
    status: 'paused',
    customerId: 'cust-05',
    customerSnapshot: { name: 'Rajesh Menon', gstin: '29AABCM7890E1Z6', address: '56 Industrial Area, Bangalore', state: 'Karnataka', stateCode: '29' },
    frequency: 'monthly',
    customDays: null,
    startDate: '2024-09-01',
    endDate: null,
    nextGenerationDate: '2025-03-01',
    autoSend: false,
    lineItems: [
      makeRLine('rli-03a', 'item-23', 'Security Services - Monthly', '998525', 1, 'NOS', 22000, 0, 18, 'inter'),
    ],
    notes: 'On-site security personnel',
    terms: 'Payment due within 30 days.',
    totalGenerated: 6,
    lastGeneratedAt: '2025-01-01T08:00:00Z',
    pausedReason: 'Client requested pause during factory renovation',
    createdAt: '2024-08-25T10:00:00Z',
    updatedAt: '2025-02-05T10:00:00Z',
  },
]

export const mockRecurringLogs: RecurringLog[] = [
  { id: 'rl-01', templateId: 'rec-01', invoiceId: 'inv-004', invoiceNumber: 'PE-2025-004', generatedAt: '2024-11-01T08:00:00Z', status: 'generated', error: null },
  { id: 'rl-02', templateId: 'rec-01', invoiceId: 'inv-023', invoiceNumber: 'PE-2025-023', generatedAt: '2024-12-01T08:00:00Z', status: 'generated', error: null },
  { id: 'rl-03', templateId: 'rec-01', invoiceId: 'inv-040', invoiceNumber: 'PE-2025-040', generatedAt: '2025-01-01T08:00:00Z', status: 'generated', error: null },
  { id: 'rl-04', templateId: 'rec-01', invoiceId: 'inv-004', invoiceNumber: 'PE-2025-004', generatedAt: '2025-02-01T08:00:00Z', status: 'sent', error: null },
  { id: 'rl-05', templateId: 'rec-02', invoiceId: 'inv-003', invoiceNumber: 'PE-2025-003', generatedAt: '2024-10-01T08:00:00Z', status: 'sent', error: null },
  { id: 'rl-06', templateId: 'rec-02', invoiceId: 'inv-025', invoiceNumber: 'PE-2025-025', generatedAt: '2025-01-01T08:00:00Z', status: 'sent', error: null },
  { id: 'rl-07', templateId: 'rec-03', invoiceId: 'inv-021', invoiceNumber: 'PE-2025-021', generatedAt: '2024-09-01T08:00:00Z', status: 'generated', error: null },
  { id: 'rl-08', templateId: 'rec-03', invoiceId: 'inv-021', invoiceNumber: 'PE-2025-021', generatedAt: '2024-10-01T08:00:00Z', status: 'generated', error: null },
  { id: 'rl-09', templateId: 'rec-03', invoiceId: 'inv-021', invoiceNumber: 'PE-2025-021', generatedAt: '2024-11-01T08:00:00Z', status: 'generated', error: null },
  { id: 'rl-10', templateId: 'rec-03', invoiceId: 'inv-021', invoiceNumber: 'PE-2025-021', generatedAt: '2024-12-01T08:00:00Z', status: 'generated', error: null },
  { id: 'rl-11', templateId: 'rec-03', invoiceId: 'inv-032', invoiceNumber: 'PE-2025-032', generatedAt: '2025-01-01T08:00:00Z', status: 'generated', error: null },
  { id: 'rl-12', templateId: 'rec-03', invoiceId: 'inv-032', invoiceNumber: 'PE-2025-032', generatedAt: '2025-02-01T08:00:00Z', status: 'failed', error: 'Client paused before generation' },
]
