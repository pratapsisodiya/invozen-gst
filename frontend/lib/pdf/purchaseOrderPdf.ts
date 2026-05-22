import type { PurchaseInvoice } from '@/types/purchase'
import type { BusinessProfile } from '@/types/business'

export async function downloadPurchaseOrderPdf(
  purchase: PurchaseInvoice,
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
  doc.text('PURCHASE ORDER', pageW - margin, 12, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${purchase.purchaseNumber}`, pageW - margin, 18, { align: 'right' })

  y = 35

  // Buyer / Vendor
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('BUYER (US)', margin, y)
  doc.text('VENDOR (SELLER)', pageW / 2 + 5, y)

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
  doc.text(purchase.vendorSnapshot.name, pageW / 2 + 5, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(`GSTIN: ${purchase.vendorSnapshot.gstin || 'Unregistered'}`, pageW / 2 + 5, y + 5)
  doc.text(purchase.vendorSnapshot.state, pageW / 2 + 5, y + 10)

  y += 22

  // Meta row
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y, contentW, 14, 'F')
  doc.setFontSize(8)
  const metaItems = [
    ['Invoice Date', new Date(purchase.invoiceDate).toLocaleDateString('en-IN')],
    ['Vendor Invoice #', purchase.vendorInvoiceNumber],
    ['Status', purchase.status.toUpperCase()],
    ['ITC Status', purchase.itcStatus.toUpperCase()],
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
  doc.text('HSN', margin + 72, y + 4.5)
  doc.text('Qty', margin + 90, y + 4.5)
  doc.text('Rate', margin + 103, y + 4.5)
  doc.text('Taxable', margin + 118, y + 4.5)
  doc.text('GST', margin + 138, y + 4.5)
  doc.text('Total', margin + 155, y + 4.5)
  doc.text('ITC', margin + 170, y + 4.5)

  y += 7
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)

  purchase.lineItems.forEach((item, idx) => {
    if (y > 250) { doc.addPage(); y = 20 }
    const rowBg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
    doc.rect(margin, y, contentW, 8, 'F')
    doc.text(String(idx + 1), margin + 2, y + 5)
    const desc = item.description.length > 28 ? item.description.substring(0, 26) + '..' : item.description
    doc.text(desc, margin + 10, y + 5)
    doc.text(item.hsnSac || '-', margin + 72, y + 5)
    doc.text(String(item.quantity), margin + 90, y + 5)
    doc.text(item.rate.toLocaleString('en-IN'), margin + 103, y + 5)
    doc.text(item.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 }), margin + 118, y + 5)
    const gst = item.cgst + item.sgst + item.igst
    doc.text(gst.toLocaleString('en-IN', { maximumFractionDigits: 2 }), margin + 138, y + 5)
    doc.text(item.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 }), margin + 155, y + 5)
    doc.setTextColor(item.itcEligible ? 5 : 156, item.itcEligible ? 150 : 163, item.itcEligible ? 105 : 175)
    doc.text(item.itcEligible ? 'Yes' : 'No', margin + 170, y + 5)
    doc.setTextColor(40, 40, 40)
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

  addRow('Taxable Value', purchase.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
  if (purchase.cgstTotal > 0) addRow('CGST', purchase.cgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
  if (purchase.sgstTotal > 0) addRow('SGST', purchase.sgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
  if (purchase.igstTotal > 0) addRow('IGST', purchase.igstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }))

  y += 2
  doc.setDrawColor(13, 148, 136)
  doc.line(totalsX - 5, y, margin + contentW, y)
  y += 3
  addRow('TOTAL', purchase.grandTotal.toLocaleString('en-IN'), true)

  y += 3
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(79, 70, 229)
  doc.text(`ITC Available: Rs. ${purchase.itcAvailable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, totalsX, y)
  y += 5
  doc.setTextColor(5, 150, 105)
  doc.text(`ITC Claimed: Rs. ${purchase.itcClaimed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, totalsX, y)

  if (purchase.notes) {
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(60, 60, 60)
    doc.text('Notes:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(doc.splitTextToSize(purchase.notes, contentW), margin, y + 5)
  }

  // Footer
  doc.setFillColor(13, 148, 136)
  doc.rect(0, 285, pageW, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('This is a Purchase Invoice record. ITC eligibility is subject to Section 16 & 17 of the CGST Act, 2017.', pageW / 2, 290, { align: 'center' })
  doc.text('Powered by Invozen GST', pageW / 2, 294, { align: 'center' })

  doc.save(`${purchase.purchaseNumber}.pdf`)
}
