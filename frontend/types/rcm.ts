export type RCMCategory =
  | 'gta'
  | 'legal'
  | 'security'
  | 'rent'
  | 'sponsorship'
  | 'director_fees'
  | 'insurance'
  | 'other'

export interface RCMFlag {
  sourceId: string
  sourceType: 'purchase' | 'expense'
  vendorName: string
  date: string
  description: string
  taxableAmount: number
  detectedCategory: RCMCategory
  categoryLabel: string
  applicableGSTRate: number
  rcmLiability: number
  confidence: 'high' | 'medium' | 'low'
}
