import type { DeliveryChallan } from '@/types/challan'
import type { BusinessProfile } from '@/types/business'
import { CHALLAN_TYPE_LABELS } from '@/types/challan'

export async function downloadChallanPdf(challan: DeliveryChallan, profile: BusinessProfile): Promise<void> {
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
  doc.text('DELIVERY CHALLAN', pageW - margin, 12, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${challan.challanNumber}`, pageW - margin, 18, { align: 'right' })
  doc.text(CHALLAN_TYPE_LABELS[challan.challanType], pageW - margin, 23, { align: 'right' })

  y = 35

  // FROM / TO
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('FROM (CONSIGNOR)', margin, y)
  doc.text('TO (CONSIGNEE)', pageW / 2 + 5, y)

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(challan.fromName, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  if (challan.fromGstin) doc.text(`GSTIN: ${challan.fromGstin}`, margin, y + 5)
  const fromAddr = doc.splitTextToSize(`${challan.fromAddress}, ${challan.fromState} - ${challan.fromPincode}`, 80)
  doc.text(fromAddr, margin, y + (challan.fromGstin ? 10 : 5))

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text(challan.toName, pageW / 2 + 5, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  if (challan.toGstin) doc.text(`GSTIN: ${challan.toGstin}`, pageW / 2 + 5, y + 5)
  const toAddr = doc.splitTextToSize(`${challan.toAddress}, ${challan.toState} - ${challan.toPincode}`, 80)
  doc.text(toAddr, pageW / 2 + 5, y + (challan.toGstin ? 10 : 5))

  y += 22

  // Meta row
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y, contentW, 14, 'F')
  doc.setFontSize(8)
  const metaItems = [
    ['Challan Date', new Date(challan.challanDate).toLocaleDateString('en-IN')],
    ['Status', challan.status.toUpperCase()],
    ['Reason', challan.reasonForTransport.substring(0, 20) || '-'],
    ...(challan.ewayBillNumber ? [['E-Way Bill', challan.ewayBillNumber]] : []),
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

  // Line items header — NO GST columns
  doc.setFillColor(30, 30, 30)
  doc.rect(margin, y, contentW, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('#', margin + 2, y + 4.5)
  doc.text('Description', margin + 10, y + 4.5)
  doc.text('HSN/SAC', margin + 90, y + 4.5)
  doc.text('Qty', margin + 118, y + 4.5)
  doc.text('Unit', margin + 132, y + 4.5)
  doc.text('Rate', margin + 148, y + 4.5)
  doc.text('Value', margin + 163, y + 4.5)

  y += 7
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)

  challan.lineItems.forEach((item, idx) => {
    if (y > 250) { doc.addPage(); y = 20 }
    const rowBg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
    doc.rect(margin, y, contentW, 8, 'F')
    doc.text(String(idx + 1), margin + 2, y + 5)
    const desc = item.description.length > 45 ? item.description.substring(0, 43) + '..' : item.description
    doc.text(desc, margin + 10, y + 5)
    doc.text(item.hsnSac || '-', margin + 90, y + 5)
    doc.text(String(item.quantity), margin + 118, y + 5)
    doc.text(item.unit, margin + 132, y + 5)
    doc.text(item.rate.toLocaleString('en-IN'), margin + 148, y + 5)
    doc.text(item.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 }), margin + 163, y + 5)
    y += 8
  })

  // Total value
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, margin + contentW, y)
  y += 5
  const totalsX = margin + contentW - 60
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('TOTAL VALUE', totalsX, y)
  doc.setTextColor(13, 148, 136)
  doc.text(`Rs. ${challan.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, margin + contentW, y, { align: 'right' })

  // Transport details
  y += 10
  if (challan.transporterName || challan.vehicleNumber) {
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, y, contentW, 16, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(60, 60, 60)
    doc.text('Transport Details', margin + 3, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    const transportParts = []
    if (challan.transporterName) transportParts.push(`Transporter: ${challan.transporterName}`)
    if (challan.vehicleNumber) transportParts.push(`Vehicle: ${challan.vehicleNumber}`)
    if (challan.transportMode) transportParts.push(`Mode: ${challan.transportMode}`)
    if (challan.distance) transportParts.push(`Distance: ${challan.distance} km`)
    doc.text(transportParts.join('   '), margin + 3, y + 11)
    y += 20
  }

  // Expected return date
  if (challan.expectedReturnDate) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(217, 119, 6)
    doc.text(`Expected Return Date: ${new Date(challan.expectedReturnDate).toLocaleDateString('en-IN')}`, margin, y)
    y += 6
  }

  // Notes
  if (challan.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(60, 60, 60)
    doc.text('Notes:', margin, y + 2)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(doc.splitTextToSize(challan.notes, contentW), margin, y + 7)
  }

  // Footer
  doc.setFillColor(13, 148, 136)
  doc.rect(0, 282, pageW, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('This is a Delivery Challan issued under Rule 55 of CGST Rules, 2017. This is NOT a Tax Invoice.', pageW / 2, 288, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text('No tax is charged on this document. GST will be charged separately on the final Tax Invoice.', pageW / 2, 293, { align: 'center' })

  doc.save(`${challan.challanNumber}.pdf`)
}
