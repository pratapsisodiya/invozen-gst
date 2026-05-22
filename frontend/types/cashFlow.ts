export interface CashFlowWeek {
  weekLabel: string
  startDate: string
  expectedInflows: number
  scheduledOutflows: number
  gstPayments: number
  netCash: number
  closingBalance: number
  isGSTWeek: boolean
}

export interface CashFlowForecast {
  weeks: CashFlowWeek[]
  netSpendableToday: number
  lowestBalance: { date: string; amount: number }
  criticalDates: Array<{ date: string; type: 'gst_due' | 'low_cash'; description: string }>
  totalExpectedInflows: number
  totalScheduledOutflows: number
  totalGSTPeriod: number
}
