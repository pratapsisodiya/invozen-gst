export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
}

export function generateInvoiceNumber(prefix: string, counter: number): string {
  const year = new Date().getFullYear()
  const seq = String(counter).padStart(3, '0')
  return `${prefix}-${year}-${seq}`
}

export function generateShortId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}
