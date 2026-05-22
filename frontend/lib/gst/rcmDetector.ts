import type { PurchaseInvoice } from '../../types/purchase'
import type { Expense } from '../../types/expense'
import type { RCMFlag, RCMCategory } from '../../types/rcm'

interface RCMRule {
  category: RCMCategory
  label: string
  gstRate: number
  keywords: string[]
  hsnKeywords?: string[]
}

const RCM_RULES: RCMRule[] = [
  {
    category: 'gta',
    label: 'Goods Transport Agency (GTA)',
    gstRate: 5,
    keywords: ['freight', 'transport', 'gta', 'goods transport', 'trucking', 'lorry', 'carrier', 'logistics', 'courier service'],
    hsnKeywords: ['9965', '9967'],
  },
  {
    category: 'legal',
    label: 'Legal / Advocate Services',
    gstRate: 18,
    keywords: ['advocate', 'legal', 'lawyer', 'attorney', 'solicitor', 'counsel', 'law firm', 'legal fee', 'legal service'],
    hsnKeywords: ['9982'],
  },
  {
    category: 'security',
    label: 'Security Personnel Services',
    gstRate: 18,
    keywords: ['security guard', 'security service', 'security personnel', 'watchman', 'guard service'],
    hsnKeywords: ['9985'],
  },
  {
    category: 'rent',
    label: 'Renting from Unregistered Person',
    gstRate: 18,
    keywords: ['rent', 'lease', 'rental', 'premises', 'office rent', 'shop rent', 'warehouse rent'],
    hsnKeywords: ['9972'],
  },
  {
    category: 'sponsorship',
    label: 'Sponsorship Services',
    gstRate: 18,
    keywords: ['sponsorship', 'sponsor', 'event sponsor'],
  },
  {
    category: 'director_fees',
    label: 'Director / Managerial Services',
    gstRate: 18,
    keywords: ['director fee', 'director remuneration', 'sitting fee', 'management fee'],
  },
  {
    category: 'insurance',
    label: 'Insurance (General)',
    gstRate: 18,
    keywords: ['insurance premium', 'general insurance'],
    hsnKeywords: ['9971'],
  },
]

function matchesRule(description: string, hsnSac: string, rule: RCMRule): boolean {
  const desc = description.toLowerCase()
  if (rule.keywords.some((kw) => desc.includes(kw))) return true
  if (rule.hsnKeywords && hsnSac) {
    const hsn = hsnSac.toLowerCase()
    if (rule.hsnKeywords.some((h) => hsn.startsWith(h))) return true
  }
  return false
}

function getConfidence(description: string, hsnSac: string, rule: RCMRule): 'high' | 'medium' | 'low' {
  const hasHsn = rule.hsnKeywords && hsnSac && rule.hsnKeywords.some((h) => hsnSac.toLowerCase().startsWith(h))
  if (hasHsn) return 'high'
  const exactKeywordCount = rule.keywords.filter((kw) => description.toLowerCase().includes(kw)).length
  return exactKeywordCount >= 2 ? 'high' : 'medium'
}

export function detectRCMExposure(
  purchases: PurchaseInvoice[],
  expenses: Expense[]
): RCMFlag[] {
  const flags: RCMFlag[] = []

  // Check unregistered vendor purchases
  for (const purchase of purchases) {
    if (purchase.vendorSnapshot.gstin) continue // registered vendor, skip

    for (const item of purchase.lineItems) {
      for (const rule of RCM_RULES) {
        if (matchesRule(item.description, item.hsnSac, rule)) {
          flags.push({
            sourceId: purchase.id,
            sourceType: 'purchase',
            vendorName: purchase.vendorSnapshot.name,
            date: purchase.invoiceDate,
            description: item.description,
            taxableAmount: item.taxableValue,
            detectedCategory: rule.category,
            categoryLabel: rule.label,
            applicableGSTRate: rule.gstRate,
            rcmLiability: Math.round(item.taxableValue * (rule.gstRate / 100) * 100) / 100,
            confidence: getConfidence(item.description, item.hsnSac, rule),
          })
          break // one rule per item
        }
      }
    }
  }

  // Check expenses from unregistered vendors
  for (const expense of expenses) {
    if (expense.isGstRegistered) continue

    for (const rule of RCM_RULES) {
      if (matchesRule(expense.description, '', rule) ||
          matchesRule(expense.category, '', rule)) {
        flags.push({
          sourceId: expense.id,
          sourceType: 'expense',
          vendorName: expense.vendorName ?? 'Unknown Vendor',
          date: expense.date,
          description: expense.description,
          taxableAmount: expense.amount,
          detectedCategory: rule.category,
          categoryLabel: rule.label,
          applicableGSTRate: rule.gstRate,
          rcmLiability: Math.round(expense.amount * (rule.gstRate / 100) * 100) / 100,
          confidence: 'low',
        })
        break
      }
    }
  }

  return flags.sort((a, b) => b.rcmLiability - a.rcmLiability)
}
