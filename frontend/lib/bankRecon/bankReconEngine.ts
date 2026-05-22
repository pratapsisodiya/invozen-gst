import type { Payment } from '@/types/payment'

export interface BankTransaction {
  id: string
  date: string
  description: string
  credit: number
  debit: number
  balance: number
  reference: string | null
}

export interface ReconMatch {
  bank: BankTransaction
  payment: Payment
  confidence: 'exact' | 'likely' | 'possible'
  amountDiff: number
}

export interface BankReconResult {
  matched: ReconMatch[]
  unmatchedBank: BankTransaction[]
  unmatchedPayments: Payment[]
  totalBankCredits: number
  totalMatchedAmount: number
}

export function parseCSV(csvText: string): BankTransaction[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))
  const transactions: BankTransaction[] = []

  const dateIdx = headers.findIndex((h) => h.includes('date'))
  const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('narr') || h.includes('particular'))
  const creditIdx = headers.findIndex((h) => h.includes('credit') || h.includes('deposit') || h.includes('cr'))
  const debitIdx = headers.findIndex((h) => h.includes('debit') || h.includes('withdrawal') || h.includes('dr'))
  const balIdx = headers.findIndex((h) => h.includes('balance') || h.includes('bal'))
  const refIdx = headers.findIndex((h) => h.includes('ref') || h.includes('cheque') || h.includes('utr'))

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/['"]/g, ''))
    const credit = parseFloat(cols[creditIdx] || '0') || 0
    const debit = parseFloat(cols[debitIdx] || '0') || 0
    if (credit === 0 && debit === 0) continue

    transactions.push({
      id: `bank-${i}`,
      date: cols[dateIdx] || '',
      description: cols[descIdx] || '',
      credit,
      debit,
      balance: parseFloat(cols[balIdx] || '0') || 0,
      reference: refIdx >= 0 ? (cols[refIdx] || null) : null,
    })
  }

  return transactions
}

function dateDiffDays(d1: string, d2: string): number {
  const t1 = new Date(d1).getTime()
  const t2 = new Date(d2).getTime()
  return Math.abs((t1 - t2) / (1000 * 60 * 60 * 24))
}

export function reconcile(bankTxns: BankTransaction[], payments: Payment[]): BankReconResult {
  const matched: ReconMatch[] = []
  const usedBankIds = new Set<string>()
  const usedPaymentIds = new Set<string>()

  // Try exact matches first (amount + reference)
  for (const txn of bankTxns) {
    if (txn.credit <= 0) continue
    for (const pay of payments) {
      if (usedPaymentIds.has(pay.id)) continue
      const exactRef = txn.reference && pay.reference &&
        txn.reference.toLowerCase().includes(pay.reference.toLowerCase())
      const exactAmount = Math.abs(txn.credit - pay.amount) < 1

      if (exactRef && exactAmount) {
        matched.push({ bank: txn, payment: pay, confidence: 'exact', amountDiff: txn.credit - pay.amount })
        usedBankIds.add(txn.id)
        usedPaymentIds.add(pay.id)
        break
      }
    }
  }

  // Amount + date proximity matches
  for (const txn of bankTxns) {
    if (usedBankIds.has(txn.id)) continue
    if (txn.credit <= 0) continue
    for (const pay of payments) {
      if (usedPaymentIds.has(pay.id)) continue
      const amountClose = Math.abs(txn.credit - pay.amount) < 1
      const dateClose = dateDiffDays(txn.date, pay.paymentDate) <= 3

      if (amountClose && dateClose) {
        matched.push({ bank: txn, payment: pay, confidence: 'likely', amountDiff: txn.credit - pay.amount })
        usedBankIds.add(txn.id)
        usedPaymentIds.add(pay.id)
        break
      }
    }
  }

  return {
    matched,
    unmatchedBank: bankTxns.filter((t) => !usedBankIds.has(t.id) && t.credit > 0),
    unmatchedPayments: payments.filter((p) => !usedPaymentIds.has(p.id)),
    totalBankCredits: bankTxns.filter((t) => t.credit > 0).reduce((s, t) => s + t.credit, 0),
    totalMatchedAmount: matched.reduce((s, m) => s + m.payment.amount, 0),
  }
}
