import type { ComplianceEvent, ComplianceSummary, FilingType } from '@/types/compliance'

// GSTR-1: due on 11th of the following month (monthly filers)
// GSTR-3B: due on 20th of the following month
// GSTR-9 (annual): due on 31 Dec of the following year
const GSTR1_DAY = 11
const GSTR3B_DAY = 20

function formatPeriod(month: number, year: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[month - 1]} ${year}`
}

function dueDateISO(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toISOString().split('T')[0]
}

// Generate events for the last 3 months + next 3 months
export function generateComplianceEvents(
  filingFrequency: 'monthly' | 'quarterly',
  filedPeriods: Record<string, { gstr1?: string; gstr3b?: string }> = {}
): ComplianceSummary {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const events: ComplianceEvent[] = []

  // Generate 6 months window: 3 past + 3 future (relative to current month)
  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()

    // Due month is the following month
    const dueMonth = month === 12 ? 1 : month + 1
    const dueYear = month === 12 ? year + 1 : year
    const periodKey = `${year}-${String(month).padStart(2, '0')}`

    if (filingFrequency === 'monthly') {
      const gstr1Due = dueDateISO(dueYear, dueMonth, GSTR1_DAY)
      const gstr3bDue = dueDateISO(dueYear, dueMonth, GSTR3B_DAY)
      const filed1 = filedPeriods[periodKey]?.gstr1
      const filed3b = filedPeriods[periodKey]?.gstr3b

      events.push({
        id: `gstr1-${periodKey}`,
        type: 'GSTR-1' as FilingType,
        period: formatPeriod(month, year),
        dueDate: gstr1Due,
        status: filed1 ? 'filed' : gstr1Due < todayStr ? 'overdue' : 'pending',
        filedDate: filed1,
      })

      events.push({
        id: `gstr3b-${periodKey}`,
        type: 'GSTR-3B' as FilingType,
        period: formatPeriod(month, year),
        dueDate: gstr3bDue,
        status: filed3b ? 'filed' : gstr3bDue < todayStr ? 'overdue' : 'pending',
        filedDate: filed3b,
      })
    }
  }

  // Annual return: GSTR-9 due 31 Dec of current year for previous FY
  const prevFY = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear()
  const gstr9Due = dueDateISO(prevFY + 1, 12, 31)
  events.push({
    id: `gstr9-${prevFY}`,
    type: 'GSTR-9' as FilingType,
    period: `FY ${prevFY}-${String(prevFY + 1).slice(2)}`,
    dueDate: gstr9Due,
    status: gstr9Due < todayStr ? 'overdue' : 'pending',
  })

  events.sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const overdue = events.filter((e) => e.status === 'overdue')
  const upcoming = events.filter((e) => e.status === 'pending' && e.dueDate >= todayStr).slice(0, 6)
  const nextDue = upcoming[0] ?? null

  return { nextDue, overdue, upcoming, allEvents: events }
}

export function daysUntilDue(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dueDate).getTime() - today.getTime()) / 86400000)
}
