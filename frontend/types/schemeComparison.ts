export interface SchemeComparison {
  currentScheme: 'regular' | 'composition'
  annualizedRevenue: number
  eligibleForComposition: boolean
  eligibilityBlockers: string[]
  regularScheme: {
    outputGST: number
    itcClaimed: number
    netGSTPaid: number
    annualFilings: number
  }
  compositionScheme: {
    compositionTax: number
    compositionRate: number
    itcLost: number
    netGSTPaid: number
    annualFilings: number
    b2bSupplyLoss: number
  }
  savingsIfSwitch: number
  recommendation: 'stay_regular' | 'switch_composition' | 'borderline' | 'ineligible'
  recommendationReason: string
}
