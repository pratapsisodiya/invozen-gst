import type { jsPDF } from 'jspdf'

export interface PdfAiAssistContext {
  documentType: string
  businessName: string
  summary: string
  highlights: string[]
  metrics?: Array<{ label: string; value: string }>
}

export interface PdfAiAssistResult {
  headline: string
  bullets: string[]
}

function fallbackAssist(context: PdfAiAssistContext): PdfAiAssistResult {
  const type = context.documentType.toLowerCase()
  const bullets = [...context.highlights]

  if (type.includes('invoice')) {
    bullets.push('Reconcile outstanding balances before the due date to reduce follow-up effort.')
    bullets.push('Keep HSN and GST rate consistency across similar line items.')
  } else if (type.includes('purchase')) {
    bullets.push('Claim ITC only when vendor details and tax values are fully verifiable.')
    bullets.push('Match invoice values against your purchase register before filing.')
  } else if (type.includes('credit note')) {
    bullets.push('Link the note back to the original invoice to preserve audit trail.')
    bullets.push('Confirm the GST reversal amount before posting the adjustment.')
  } else if (type.includes('quotation')) {
    bullets.push('Follow up before the validity date so the opportunity does not lapse.')
    bullets.push('Convert quickly to an invoice once the customer accepts the quote.')
  } else if (type.includes('challan')) {
    bullets.push('Keep transporter and vehicle details aligned with the dispatch record.')
    bullets.push('Issue the tax invoice promptly if the challan later becomes a sale.')
  } else if (type.includes('statement')) {
    bullets.push('Focus on the oldest overdue invoices first to improve collections.')
    bullets.push('Use the payment pattern to spot accounts that need tighter terms.')
  } else if (type.includes('receipt')) {
    bullets.push('Match the receipt reference to the exact payment entry for faster reconciliation.')
    bullets.push('Use the receipt as a reference point for pending part-payments.')
  } else if (type.includes('ledger')) {
    bullets.push('Compare output GST and input tax before preparing the return.')
    bullets.push('Review the highest-value entries first for filing accuracy.')
  } else {
    bullets.push('Review the key figures before sharing this document externally.')
    bullets.push('Keep the linked source record updated for audit readiness.')
  }

  const uniqueBullets = Array.from(new Set(bullets)).slice(0, 3)
  return {
    headline: `AI Assist for ${context.documentType}`,
    bullets: uniqueBullets.length > 0 ? uniqueBullets : ['Review the record before sharing it.'],
  }
}

async function fetchPdfAssist(context: PdfAiAssistContext): Promise<PdfAiAssistResult> {
  try {
    const response = await fetch('/api/ai/pdf-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    })

    if (!response.ok) return fallbackAssist(context)

    const data = await response.json() as Partial<PdfAiAssistResult>
    const bullets = Array.isArray(data.bullets) ? data.bullets.filter((bullet): bullet is string => typeof bullet === 'string' && bullet.trim().length > 0) : []

    return {
      headline: typeof data.headline === 'string' && data.headline.trim().length > 0 ? data.headline : `AI Assist for ${context.documentType}`,
      bullets: bullets.length > 0 ? bullets.slice(0, 3) : fallbackAssist(context).bullets,
    }
  } catch {
    return fallbackAssist(context)
  }
}

export async function appendPdfAiAssistSection(
  doc: jsPDF,
  y: number,
  context: PdfAiAssistContext,
  pageW = 210,
  pageH = 297,
  margin = 15
): Promise<number> {
  const assist = await fetchPdfAssist(context)
  const sectionHeight = 22 + assist.bullets.length * 5 + Math.max(0, context.metrics?.length ?? 0) * 4

  if (y + sectionHeight > pageH - 18) {
    doc.addPage()
    y = 18
  }

  const contentW = pageW - margin * 2
  doc.setFillColor(245, 248, 250)
  doc.setDrawColor(191, 219, 254)
  doc.roundedRect(margin, y, contentW, sectionHeight, 3, 3, 'FD')

  doc.setFillColor(59, 130, 246)
  doc.roundedRect(margin + 3, y + 3, 24, 6, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text('AI ASSIST', margin + 15, y + 7.2, { align: 'center' })

  doc.setTextColor(31, 41, 55)
  doc.setFontSize(9.5)
  doc.text(assist.headline, margin + 3, y + 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(55, 65, 81)
  doc.text(doc.splitTextToSize(context.summary, contentW - 6), margin + 3, y + 20)

  let bulletY = y + 27
  assist.bullets.forEach((bullet) => {
    doc.setTextColor(37, 99, 235)
    doc.text('•', margin + 3, bulletY)
    doc.setTextColor(55, 65, 81)
    doc.text(doc.splitTextToSize(bullet, contentW - 10), margin + 7, bulletY)
    bulletY += 5
  })

  if (context.metrics && context.metrics.length > 0) {
    const metricY = bulletY + 1
    doc.setTextColor(31, 41, 55)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    context.metrics.slice(0, 3).forEach((metric, index) => {
      const x = margin + 3 + index * (contentW / 3)
      doc.text(metric.label, x, metricY)
      doc.setFont('helvetica', 'normal')
      doc.text(metric.value, x, metricY + 4)
      doc.setFont('helvetica', 'bold')
    })
  }

  return y + sectionHeight + 4
}