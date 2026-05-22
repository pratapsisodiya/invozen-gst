export type FilingType = 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' | 'GSTR-9C'
export type FilingStatus = 'not_started' | 'in_progress' | 'reviewed' | 'filed'

export interface FilingChecklistItem {
  id: string
  label: string
  completed: boolean
}

export interface FilingRecord {
  id: string
  type: FilingType
  period: string
  status: FilingStatus
  dueDate: string
  filedDate: string | null
  filedBy: string | null
  notes: string | null
  checklistItems: FilingChecklistItem[]
  createdAt: string
  updatedAt: string
}

export const FILING_CHECKLISTS: Record<FilingType, string[]> = {
  'GSTR-1': [
    'Verify all B2B invoices have valid GSTINs',
    'Confirm HSN/SAC codes on all line items',
    'Reconcile B2CS aggregate values',
    'Check credit/debit notes are included',
    'Verify place of supply for inter-state invoices',
    'Review nil-rated and exempt supplies',
  ],
  'GSTR-3B': [
    'Confirm outward supply totals match GSTR-1',
    'Verify ITC available from purchases',
    'Check ITC eligibility (blocked credit excluded)',
    'Review reverse charge liability',
    'Confirm net tax payable calculation',
    'Ensure payment of tax before due date',
  ],
  'GSTR-9': [
    'Aggregate all monthly GSTR-1 data for the year',
    'Reconcile with GSTR-2A/2B for ITC',
    'Include amendments from previous returns',
    'Verify HSN summary for the full year',
    'Confirm total tax paid vs liability',
    'Review any late fees or interest',
  ],
  'GSTR-9C': [
    'Get audited financial statements',
    'Reconcile turnover in books vs GSTR-9',
    'Verify ITC in books vs GST returns',
    'Prepare reconciliation statement',
    'Get CA certification',
    'File along with GSTR-9',
  ],
}
