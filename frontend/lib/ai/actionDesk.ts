import type { BusinessProfile, AppSettings } from '@/types/business'
import type { Customer } from '@/types/customer'
import type { Expense } from '@/types/expense'
import type { Invoice } from '@/types/invoice'
import type { Payment } from '@/types/payment'
import type { PurchaseInvoice } from '@/types/purchase'
import type { RecurringTemplate } from '@/types/recurring'
import type { AgentAction, AgentActionGroup, AgentActionResponse, AgentActionType } from '@/types/agentAction'
import { detectRCMExposure } from '@/lib/gst/rcmDetector'
import { buildCashFlowForecast } from '@/lib/reports/cashFlowForecast'
import { buildCustomerPaymentProfiles, predictInvoicePayment } from '@/lib/reports/paymentPredictor'
import { computeTaxProjection } from '@/lib/gst/taxLiabilityProjection'

export interface ActionDeskSnapshot {
  invoices: Invoice[]
  purchases: PurchaseInvoice[]
  expenses: Expense[]
  customers: Customer[]
  payments: Payment[]
  recurringTemplates: RecurringTemplate[]
  profile: BusinessProfile
  settings: AppSettings
}

const DAY_MS = 86400000

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function daysBetween(targetDate: string, refDate = new Date()) {
  const target = new Date(targetDate)
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  const refUtc = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())
  return Math.round((targetUtc - refUtc) / DAY_MS)
}

function formatCurrency(amount: number) {
  return `Rs.${Math.round(amount).toLocaleString('en-IN')}`
}

export function getActionGroup(type: AgentActionType): AgentActionGroup {
  switch (type) {
    case 'overdue_followup':
    case 'payment_risk':
      return 'Collect Money'
    case 'itc_claim':
      return 'Save GST / Claim ITC'
    case 'gst_anomaly':
    case 'rcm_review':
    case 'vendor_risk':
      return 'Fix Compliance Risks'
    case 'filing_task':
      return 'Prepare Filing'
    case 'cash_warning':
    case 'manual_task':
      return 'Protect Cash'
  }
}

function compareActions(a: AgentAction, b: AgentAction) {
  const urgencyRank = { high: 3, medium: 2, low: 1 }
  if (urgencyRank[a.urgency] !== urgencyRank[b.urgency]) {
    return urgencyRank[b.urgency] - urgencyRank[a.urgency]
  }
  return (b.impactValue ?? 0) - (a.impactValue ?? 0)
}

function getNextFilingDate(profile: BusinessProfile, refDate = new Date()) {
  const month = refDate.getMonth()
  const year = refDate.getFullYear()

  if (profile.filingFrequency === 'quarterly') {
    const quarterEndMonths = [2, 5, 8, 11]
    const nextQuarterEnd = quarterEndMonths.find((value) => value >= month) ?? 11
    const dueMonth = nextQuarterEnd + 1
    return new Date(dueMonth > 11 ? year + 1 : year, dueMonth > 11 ? 0 : dueMonth, 22)
  }

  const dueMonth = month === 11 ? 0 : month + 1
  const dueYear = month === 11 ? year + 1 : year
  return new Date(dueYear, dueMonth, 20)
}

function createAction(base: Omit<AgentAction, 'group'> & { group?: AgentActionGroup }): AgentAction {
  return {
    ...base,
    group: base.group ?? getActionGroup(base.type),
    secondaryActionLabel: base.secondaryActionLabel ?? 'Why this?',
    source: base.source ?? 'system',
  }
}

function buildOverdueActions(invoices: Invoice[]): AgentAction[] {
  return invoices
    .filter((invoice) => invoice.status === 'overdue' && invoice.balanceDue > 0)
    .sort((a, b) => {
      const dayDiff = daysBetween(a.dueDate) - daysBetween(b.dueDate)
      if (dayDiff !== 0) return dayDiff
      return b.balanceDue - a.balanceDue
    })
    .slice(0, 3)
    .map((invoice) => {
      const overdueDays = Math.abs(Math.min(daysBetween(invoice.dueDate), 0))
      return createAction({
        id: `overdue-${invoice.id}`,
        type: 'overdue_followup',
        title: `Follow up on ${invoice.invoiceNumber}`,
        summary: `${invoice.customerSnapshot.name} is overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'} with ${formatCurrency(invoice.balanceDue)} pending.`,
        urgency: overdueDays > 14 || invoice.balanceDue >= 100000 ? 'high' : 'medium',
        confidence: 'high',
        impactLabel: 'Outstanding',
        impactValue: invoice.balanceDue,
        reason: `This invoice is already overdue, and collecting ${formatCurrency(invoice.balanceDue)} improves cash position immediately.`,
        targetHref: `/invoices/${invoice.id}`,
        entityId: invoice.id,
      primaryActionLabel: 'Open invoice',
      statusLabel: 'Insight',
    })
    })
}


function buildPaymentRiskActions(invoices: Invoice[], payments: Payment[]): AgentAction[] {
  const profiles = buildCustomerPaymentProfiles(invoices, payments)
  const profileMap = new Map(profiles.map((profile) => [profile.customerId, profile]))

  return invoices
    .filter((invoice) => invoice.status === 'sent' && invoice.balanceDue > 0)
    .map((invoice) => ({ invoice, prediction: predictInvoicePayment(invoice, profileMap.get(invoice.customerId)) }))
    .filter(({ prediction }) => prediction.prob7Days <= 40 || prediction.daysOverdue > 0)
    .sort((a, b) => a.prediction.prob7Days - b.prediction.prob7Days || b.invoice.balanceDue - a.invoice.balanceDue)
    .slice(0, 2)
    .map(({ invoice, prediction }) => createAction({
      id: `payment-risk-${invoice.id}`,
      type: 'payment_risk',
      title: `Payment risk for ${invoice.customerSnapshot.name}`,
      summary: `${invoice.invoiceNumber} has only a ${prediction.prob7Days}% chance of clearing in 7 days.`,
      urgency: prediction.prob7Days <= 20 ? 'high' : 'medium',
      confidence: prediction.confidence,
      impactLabel: 'At risk',
      impactValue: invoice.balanceDue,
      reason: prediction.basis,
      targetHref: '/payment-prediction',
      entityId: invoice.id,
      primaryActionLabel: 'Review forecast',
      statusLabel: 'Insight',
    }))
}

function buildItcActions(purchases: PurchaseInvoice[]): AgentAction[] {
  const eligible = purchases
    .filter((purchase) => purchase.itcStatus === 'eligible' && purchase.itcAvailable > purchase.itcClaimed)
    .sort((a, b) => (b.itcAvailable - b.itcClaimed) - (a.itcAvailable - a.itcClaimed))

  if (eligible.length === 0) return []

  const totalPending = eligible.reduce((sum, purchase) => sum + Math.max(0, purchase.itcAvailable - purchase.itcClaimed), 0)
  const topPurchase = eligible[0]

  return [
    createAction({
      id: 'itc-pending',
      type: 'itc_claim',
      title: 'Claim pending ITC',
      summary: `${eligible.length} purchase${eligible.length === 1 ? '' : 's'} still carry ${formatCurrency(totalPending)} of claimable ITC.`,
      urgency: totalPending >= 50000 ? 'high' : 'medium',
      confidence: 'high',
      impactLabel: 'Tax saving',
      impactValue: roundCurrency(totalPending),
      reason: `${topPurchase.vendorSnapshot.name} alone accounts for ${formatCurrency(Math.max(0, topPurchase.itcAvailable - topPurchase.itcClaimed))} of pending credit.`,
      targetHref: '/itc-reconciliation',
      entityId: topPurchase.id,
      primaryActionLabel: 'Open ITC recon',
      statusLabel: 'Insight',
    }),
  ]
}

function buildAnomalyActions(invoices: Invoice[]): AgentAction[] {
  const flagged = invoices
    .filter((invoice) => invoice.invoiceType === 'tax_invoice' && invoice.status !== 'void')
    .map((invoice) => {
      const missingHsn = invoice.lineItems.some((item) => !item.hsnSac.trim())
      const zeroTax = invoice.lineItems.some((item) => item.gstRate === 0 && item.description.trim())
      return { invoice, missingHsn, zeroTax }
    })
    .filter((item) => item.missingHsn || item.zeroTax)
    .slice(0, 2)

  return flagged.map(({ invoice, missingHsn, zeroTax }) => createAction({
    id: `gst-anomaly-${invoice.id}`,
    type: 'gst_anomaly',
    title: `Review GST setup on ${invoice.invoiceNumber}`,
    summary: `${missingHsn ? 'One or more items are missing HSN/SAC.' : ''}${missingHsn && zeroTax ? ' ' : ''}${zeroTax ? 'A taxable invoice contains zero-rate lines.' : ''}`.trim(),
    urgency: 'medium',
    confidence: 'medium',
    impactLabel: 'Invoice value',
    impactValue: invoice.grandTotal,
    reason: 'Missing HSN/SAC or unexpected zero-rate items can create filing mismatches and compliance questions later.',
    targetHref: `/invoices/${invoice.id}/edit`,
    entityId: invoice.id,
    primaryActionLabel: 'Fix invoice',
    statusLabel: 'Insight',
  }))
}

function buildRcmActions(purchases: PurchaseInvoice[], expenses: Expense[]): AgentAction[] {
  const flags = detectRCMExposure(purchases, expenses)
  if (flags.length === 0) return []

  const totalLiability = flags.reduce((sum, flag) => sum + flag.rcmLiability, 0)
  const topFlag = flags[0]

  return [
    createAction({
      id: 'rcm-review',
      type: 'rcm_review',
      title: 'Review reverse-charge exposure',
      summary: `${flags.length} transaction${flags.length === 1 ? '' : 's'} may trigger RCM with about ${formatCurrency(totalLiability)} at stake.`,
      urgency: totalLiability >= 10000 ? 'high' : 'medium',
      confidence: topFlag.confidence,
      impactLabel: 'RCM liability',
      impactValue: roundCurrency(totalLiability),
      reason: `${topFlag.vendorName} is the highest exposure under ${topFlag.categoryLabel}.`,
      targetHref: '/rcm-detective',
      entityId: topFlag.sourceId,
      primaryActionLabel: 'Open RCM review',
      statusLabel: 'Insight',
    }),
  ]
}

function buildCashWarningActions(snapshot: ActionDeskSnapshot): AgentAction[] {
  const taxProjection = computeTaxProjection(snapshot.invoices, snapshot.purchases, snapshot.settings.currentBankBalance)
  const profiles = buildCustomerPaymentProfiles(snapshot.invoices, snapshot.payments)
  const forecast = buildCashFlowForecast(snapshot.invoices, snapshot.purchases, profiles, taxProjection, snapshot.settings.currentBankBalance)

  if (forecast.lowestBalance.amount >= snapshot.settings.cashAlertThreshold && forecast.netSpendableToday >= 0) {
    return []
  }

  return [
    createAction({
      id: 'cash-warning',
      type: 'cash_warning',
      title: forecast.netSpendableToday < 0 ? 'Bank balance is below safe spend' : 'Cash buffer is getting tight',
      summary: `Lowest projected balance is ${formatCurrency(forecast.lowestBalance.amount)} and current safe spend is ${formatCurrency(forecast.netSpendableToday)}.`,
      urgency: forecast.lowestBalance.amount < 0 ? 'high' : 'medium',
      confidence: 'medium',
      impactLabel: 'Lowest balance',
      impactValue: forecast.lowestBalance.amount,
      reason: `Upcoming GST and vendor outflows can push cash down by ${formatCurrency(snapshot.settings.currentBankBalance - forecast.lowestBalance.amount)} over the next 90 days.`,
      targetHref: '/cash-command',
      primaryActionLabel: 'Open cash command',
      statusLabel: 'Insight',
    }),
  ]
}

function buildFilingAction(snapshot: ActionDeskSnapshot): AgentAction[] {
  const dueDate = getNextFilingDate(snapshot.profile)
  const daysToDue = daysBetween(dueDate.toISOString().slice(0, 10))
  if (daysToDue > 10) return []

  return [
    createAction({
      id: `filing-${dueDate.toISOString().slice(0, 10)}`,
      type: 'filing_task',
      title: 'Prepare the next GST filing',
      summary: `Your next ${snapshot.profile.filingFrequency === 'quarterly' ? 'quarterly' : 'monthly'} filing is due in ${Math.max(daysToDue, 0)} day${Math.max(daysToDue, 0) === 1 ? '' : 's'}.`,
      urgency: daysToDue <= 3 ? 'high' : 'medium',
      confidence: 'high',
      impactLabel: 'Due in',
      impactValue: Math.max(daysToDue, 0),
      reason: 'Preparing the checklist early reduces last-minute filing mismatches across GSTR-1, 3B, and purchase records.',
      targetHref: '/filing-workflow',
      primaryActionLabel: 'Open filing workflow',
      statusLabel: 'Insight',
    }),
  ]
}

function buildVendorRiskActions(purchases: PurchaseInvoice[]): AgentAction[] {
  const unregistered = purchases
    .filter((purchase) => !purchase.vendorSnapshot.gstin && purchase.itcAvailable > 0)
    .sort((a, b) => b.itcAvailable - a.itcAvailable)

  if (unregistered.length === 0) return []

  const top = unregistered[0]
  return [
    createAction({
      id: `vendor-risk-${top.id}`,
      type: 'vendor_risk',
      title: `Vendor GST risk: ${top.vendorSnapshot.name}`,
      summary: `This purchase carries ${formatCurrency(top.itcAvailable)} of tax value while the vendor GSTIN is missing.`,
      urgency: top.itcAvailable >= 10000 ? 'high' : 'medium',
      confidence: 'medium',
      impactLabel: 'Potential ITC risk',
      impactValue: top.itcAvailable,
      reason: 'Missing supplier GST registration data makes ITC verification weaker and increases reconciliation follow-up work.',
      targetHref: `/purchases/${top.id}`,
      entityId: top.id,
      primaryActionLabel: 'Review purchase',
      statusLabel: 'Insight',
    }),
  ]
}

export function buildDeterministicActions(snapshot: ActionDeskSnapshot): AgentAction[] {
  return [
    ...buildOverdueActions(snapshot.invoices),
    ...buildPaymentRiskActions(snapshot.invoices, snapshot.payments),
    ...buildItcActions(snapshot.purchases),
    ...buildAnomalyActions(snapshot.invoices),
    ...buildRcmActions(snapshot.purchases, snapshot.expenses),
    ...buildCashWarningActions(snapshot),
    ...buildFilingAction(snapshot),
    ...buildVendorRiskActions(snapshot.purchases),
  ].sort(compareActions)
}

export function buildActionDeskResponse(snapshot: ActionDeskSnapshot): AgentActionResponse {
  return {
    actions: buildDeterministicActions(snapshot),
    generatedAt: new Date().toISOString(),
    source: 'deterministic',
  }
}

export function inferActionTypeFromText(text: string): AgentActionType {
  const normalized = text.toLowerCase()
  if (normalized.includes('overdue') || normalized.includes('collect') || normalized.includes('reminder')) return 'overdue_followup'
  if (normalized.includes('cash') || normalized.includes('bank balance') || normalized.includes('liquidity')) return 'cash_warning'
  if (normalized.includes('itc') || normalized.includes('credit')) return 'itc_claim'
  if (normalized.includes('filing') || normalized.includes('gstr') || normalized.includes('return')) return 'filing_task'
  if (normalized.includes('vendor') || normalized.includes('supplier')) return 'vendor_risk'
  if (normalized.includes('rcm')) return 'rcm_review'
  if (normalized.includes('gst') || normalized.includes('hsn') || normalized.includes('invoice')) return 'gst_anomaly'
  if (normalized.includes('payment') || normalized.includes('forecast')) return 'payment_risk'
  return 'manual_task'
}
