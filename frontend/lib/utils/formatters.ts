import { format, parseISO, isValid } from 'date-fns'

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatCurrencyWithSymbol(amount: number): string {
  return `₹${formatCurrency(amount)}`
}

export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  try {
    const d = parseISO(dateStr)
    if (!isValid(d)) return dateStr
    return format(d, fmt)
  } catch {
    return dateStr
  }
}

export function formatGSTIN(gstin: string): string {
  if (!gstin || gstin.length !== 15) return gstin
  return `${gstin.slice(0, 2)} ${gstin.slice(2, 7)} ${gstin.slice(7, 11)} ${gstin.slice(11, 12)} ${gstin.slice(12, 15)}`
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 10) return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`
  return phone
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function getDaysOverdue(dueDate: string): number {
  const todayMs = new Date(new Date().toLocaleDateString('en-CA')).getTime()
  return Math.floor((todayMs - new Date(dueDate).getTime()) / 86400000)
}

export type OverdueSeverity = 'none' | 'mild' | 'moderate' | 'serious' | 'critical'

export function getOverdueSeverity(days: number): OverdueSeverity {
  if (days <= 0) return 'none'
  if (days <= 15) return 'mild'
  if (days <= 30) return 'moderate'
  if (days <= 60) return 'serious'
  return 'critical'
}
