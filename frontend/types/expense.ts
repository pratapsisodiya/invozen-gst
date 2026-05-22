export type ExpenseCategory =
  | 'travel'
  | 'office'
  | 'utilities'
  | 'marketing'
  | 'salaries'
  | 'rent'
  | 'professional'
  | 'maintenance'
  | 'other'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  travel: 'Travel & Transport',
  office: 'Office Supplies',
  utilities: 'Utilities & Internet',
  marketing: 'Marketing & Ads',
  salaries: 'Salaries & Wages',
  rent: 'Rent & Premises',
  professional: 'Professional Fees',
  maintenance: 'Repairs & Maintenance',
  other: 'Other',
}

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory
  description: string
  vendorName: string | null
  vendorGstin: string | null
  amount: number
  gstRate: number
  gstAmount: number
  totalAmount: number
  isGstRegistered: boolean
  isItcEligible: boolean
  supplyType: 'intra' | 'inter'
  paymentMethod: string
  reference: string | null
  receiptRef: string | null
  notes: string | null
  createdAt: string
}
