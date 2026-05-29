import type { CreditNote } from '@/types/creditNote'
import type { BusinessProfile } from '@/types/business'
import { CREDIT_NOTE_REASON_LABELS } from '@/types/creditNote'
import { appendPdfAiAssistSection } from '@/lib/pdf/pdfAiAssist'

export async function downloadCreditNotePdf(
  cn: CreditNote,
  profile: BusinessProfile
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 15
  const contentW = pageW - margin * 2
  let y = 0

  // Teal header
  doc.setFillColor(13, 148, 136)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(profile.businessName, margin, 12)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`GSTIN: ${profile.gstin || 'Unregistered'}`, margin, 18)
  doc.text(`${profile.billingAddress.city}, ${profile.billingAddress.state}`, margin, 23)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('CREDIT NOTE', pageW - margin, 12, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${cn.creditNoteNumber}`, pageW - margin, 18, { align: 'right' })

  y = 35

  // Bill From / Bill To
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('FROM', margin, y)
  doc.text('TO', pageW / 2 + 5, y)

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(profile.businessName, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(`GSTIN: ${profile.gstin || 'Unregistered'}`, margin, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text(cn.customerSnapshot.name, pageW / 2 + 5, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(`GSTIN: ${cn.customerSnapshot.gstin || 'Unregistered'}`, pageW / 2 + 5, y + 5)
  doc.text(cn.customerSnapshot.state, pageW / 2 + 5, y + 10)

  y += 22

  // Meta row
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y, contentW, 14, 'F')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  const metaItems = [
    ['Date', new Date(cn.createdAt).toLocaleDateString('en-IN')],
    ['Linked Invoice', cn.linkedInvoiceNumber],
    ['Reason', CREDIT_NOTE_REASON_LABELS[cn.reason]],
    ['Status', cn.status.toUpperCase()],
  ]
  const colW = contentW / metaItems.length
  metaItems.forEach(([label, value], i) => {
    const x = margin + i * colW + 3
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text(label, x, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)
    doc.text(value, x, y + 10)
  })

  y += 20

  // Line items header
  doc.setFillColor(30, 30, 30)
  doc.rect(margin, y, contentW, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('#', margin + 2, y + 4.5)
  doc.text('Description', margin + 10, y + 4.5)
  doc.text('HSN', margin + 75, y + 4.5)
  doc.text('Qty', margin + 95, y + 4.5)
  doc.text('Rate', margin + 108, y + 4.5)
  doc.text('Taxable', margin + 122, y + 4.5)
  doc.text('GST', margin + 142, y + 4.5)
  doc.text('Total', margin + 163, y + 4.5)

  y += 7
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)

  cn.lineItems.forEach((item, idx) => {
    if (y > 250) { doc.addPage(); y = 20 }
    const rowBg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
    doc.rect(margin, y, contentW, 8, 'F')
    doc.text(String(idx + 1), margin + 2, y + 5)
    const desc = item.description.length > 32 ? item.description.substring(0, 30) + '..' : item.description
    doc.text(desc, margin + 10, y + 5)
    doc.text(item.hsnSac || '-', margin + 75, y + 5)
    doc.text(String(item.quantity), margin + 95, y + 5)
    doc.text(item.rate.toLocaleString('en-IN'), margin + 108, y + 5)
    doc.text(item.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 }), margin + 122, y + 5)
    const gst = item.cgst + item.sgst + item.igst
    doc.text(gst.toLocaleString('en-IN', { maximumFractionDigits: 2 }), margin + 142, y + 5)
    doc.text(item.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 }), margin + 163, y + 5)
    y += 8
  })

  // Totals
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, margin + contentW, y)
  y += 6

  const totalsX = margin + contentW - 60
  const totalsValueX = margin + contentW
  const addRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 9 : 8)
    doc.setTextColor(80, 80, 80)
    doc.text(label, totalsX, y)
    doc.setTextColor(20, 20, 20)
    doc.text(`Rs. ${value}`, totalsValueX, y, { align: 'right' })
    y += 5
  }

  addRow('Taxable Value', cn.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
  if (cn.cgstTotal > 0) addRow('CGST', cn.cgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
  if (cn.sgstTotal > 0) addRow('SGST', cn.sgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
  if (cn.igstTotal > 0) addRow('IGST', cn.igstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }))

  y += 2
  doc.setDrawColor(13, 148, 136)
  doc.line(totalsX - 5, y, margin + contentW, y)
  y += 3
  addRow('CREDIT NOTE TOTAL', cn.grandTotal.toLocaleString('en-IN'), true)

  if (cn.notes) {
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(60, 60, 60)
    doc.text('Notes:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(doc.splitTextToSize(cn.notes, contentW), margin, y + 5)
  }

  await appendPdfAiAssistSection(doc, y, {
    documentType: 'Credit Note',
    businessName: profile.businessName,
    summary: `Credit note ${cn.creditNoteNumber} for ${cn.customerSnapshot.name}. The adjustment total is Rs. ${cn.grandTotal.toLocaleString('en-IN')}, linked to invoice ${cn.linkedInvoiceNumber}.`,
    highlights: [
      `Reason: ${CREDIT_NOTE_REASON_LABELS[cn.reason]}`,
      `Status: ${cn.status}`,
      `Tax reversal: Rs. ${(cn.cgstTotal + cn.sgstTotal + cn.igstTotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    ],
    metrics: [
      { label: 'Note Total', value: `Rs. ${cn.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
      { label: 'Original Invoice', value: cn.linkedInvoiceNumber },
      { label: 'Reason', value: CREDIT_NOTE_REASON_LABELS[cn.reason] },
    ],
  })

  // Footer
  doc.setFillColor(13, 148, 136)
  doc.rect(0, 285, pageW, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('This is a GST Credit Note issued under Section 34 of the CGST Act, 2017.', pageW / 2, 290, { align: 'center' })
  doc.text('Powered by Invozen GST', pageW / 2, 294, { align: 'center' })

  doc.save(`${cn.creditNoteNumber}.pdf`)
}
