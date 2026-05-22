const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function convertHundreds(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) {
    const tens = TENS[Math.floor(n / 10)]
    const ones = ONES[n % 10]
    return ones ? `${tens} ${ones}` : tens
  }
  const hundreds = ONES[Math.floor(n / 100)]
  const rest = n % 100
  return rest ? `${hundreds} Hundred ${convertHundreds(rest)}` : `${hundreds} Hundred`
}

export function formatAmountInWords(amount: number): string {
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only'

  // For very large amounts (>= 100 crore) fall back to numeric display
  if (rupees >= 10000000000) {
    return `Rupees ${rupees.toLocaleString('en-IN')} Only`
  }

  let words = ''

  const crore = Math.floor(rupees / 10000000)
  const lakh = Math.floor((rupees % 10000000) / 100000)
  const thousand = Math.floor((rupees % 100000) / 1000)
  const rest = rupees % 1000

  if (crore > 0) words += `${convertHundreds(crore)} Crore `
  if (lakh > 0) words += `${convertHundreds(lakh)} Lakh `
  if (thousand > 0) words += `${convertHundreds(thousand)} Thousand `
  if (rest > 0) words += `${convertHundreds(rest)} `

  words = words.trim()

  let result = `Rupees ${words}`
  if (paise > 0) {
    result += ` and ${convertHundreds(paise)} Paise`
  }
  result += ' Only'

  return result.replace(/\s+/g, ' ').trim()
}

export function formatIndianCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `₹${formatted}`
}

export function formatIndianNumber(amount: number): string {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toFixed(0)}`
}
