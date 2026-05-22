export interface CurrencyInfo {
  code: string
  symbol: string
  name: string
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
]

export function getCurrencyInfo(code: string): CurrencyInfo {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0]
}

export function formatForeignAmount(amount: number, currencyCode: string): string {
  const info = getCurrencyInfo(currencyCode)
  if (currencyCode === 'INR') return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  return `${info.symbol}${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function convertToINR(amount: number, exchangeRate: number): number {
  return Math.round(amount * exchangeRate * 100) / 100
}

export function convertFromINR(inrAmount: number, exchangeRate: number): number {
  if (exchangeRate === 0) return 0
  return Math.round((inrAmount / exchangeRate) * 100) / 100
}
