export function calculateLateInterest(
  principal: number,
  dueDateStr: string,
  asOfDateStr?: string
): number {
  const due = new Date(dueDateStr)
  const asOf = asOfDateStr ? new Date(asOfDateStr) : new Date()
  const daysOverdue = Math.max(0, Math.floor((asOf.getTime() - due.getTime()) / 86400000))
  return Math.round((principal * 0.18 / 365 * daysOverdue) * 100) / 100
}
