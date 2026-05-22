import type { Invoice } from '@/types/invoice'
import type { BusinessProfile, AppSettings } from '@/types/business'

export async function downloadInvoicePdf(
  invoice: Invoice,
  profile: BusinessProfile,
  settings: AppSettings
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const intra = invoice.supplyType === 'intra'
  const isProforma = invoice.invoiceType === 'proforma'
  const isBillOfSupply = invoice.invoiceType === 'bill_of_supply'

  // Page dimensions
  const pageW = 210
  const margin = 15
  const contentW = pageW - margin * 2
  let y = 15

  // Load logo if available
  let logoImage: string | null = null
  if (profile.logoUrl) {
    try {
      const response = await fetch(profile.logoUrl)
      const blob = await response.blob()
      const reader = new FileReader()
      logoImage = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Failed to load logo:', error)
      // Continue without logo
    }
  }

  // Header background
  doc.setFillColor(13, 148, 136)
  doc.rect(0, 0, pageW, 28, 'F')

  // Business logo or name
  doc.setTextColor(255, 255, 255)
  if (logoImage) {
    try {
      doc.addImage(logoImage, 'PNG', margin, 5, 40, 20)
      // Business name below logo
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(profile.businessName, margin + 45, 12)
    } catch (error) {
      console.error('Failed to add logo to PDF:', error)
      // Fallback to text
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(profile.businessName, margin, 12)
    }
  } else {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(profile.businessName, margin, 12)
  }

  // GSTIN
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`GSTIN: ${profile.gstin || 'Unregistered'}`, margin, 18)
  doc.text(`${profile.billingAddress.city}, ${profile.billingAddress.state} - ${profile.billingAddress.pincode}`, margin, 23)

  // Invoice title (right aligned)
  const title = isProforma ? 'PROFORMA INVOICE' : isBillOfSupply ? 'BILL OF SUPPLY' : 'TAX INVOICE'
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageW - margin, 12, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${invoice.invoiceNumber}`, pageW - margin, 18, { align: 'right' })

  y = 35

  // Bill From / Bill To
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL FROM', margin, y)
  doc.text('BILL TO', pageW / 2 + 5, y)

  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  // Left column - Bill From
  doc.setFont('helvetica', 'bold')
  doc.text(profile.businessName, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`GSTIN: ${profile.gstin || 'Unregistered'}`, margin, y + 5)
  doc.text(profile.email, margin, y + 10)
  doc.text(profile.phone, margin, y + 15)

  // Right column - Bill To
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(invoice.customerSnapshot.name, pageW / 2 + 5, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`GSTIN: ${invoice.customerSnapshot.gstin || 'Unregistered'}`, pageW / 2 + 5, y + 5)
  doc.text(invoice.customerSnapshot.state, pageW / 2 + 5, y + 10)

  y += 25

  // Invoice meta
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y, contentW, 14, 'F')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  const metaItems = [
    ['Invoice Date', new Date(invoice.invoiceDate).toLocaleDateString('en-IN')],
    ['Due Date', new Date(invoice.dueDate).toLocaleDateString('en-IN')],
    ['Place of Supply', invoice.placeOfSupply],
    ['Supply Type', intra ? 'Intra-State' : 'Inter-State'],
  ]
  const colW = contentW / metaItems.length
  metaItems.forEach(([label, value], i) => {
    const x = margin + i * colW + 3
    doc.setFont('helvetica', 'bold')
    doc.text(label, x, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)
    doc.text(value, x, y + 10)
    doc.setTextColor(100, 100, 100)
  })

  y += 20

  // Line items table header
  doc.setFillColor(30, 30, 30)
  doc.rect(margin, y, contentW, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')

  const cols = isBillOfSupply
    ? { '#': margin + 2, 'Description': margin + 10, 'HSN': margin + 70, 'Qty': margin + 90, 'Unit': margin + 103, 'Rate': margin + 118, 'Total': margin + 155 }
    : intra
      ? { '#': margin + 2, 'Description': margin + 10, 'HSN': margin + 70, 'Qty': margin + 90, 'Rate': margin + 103, 'Taxable': margin + 118, 'CGST': margin + 135, 'SGST': margin + 148, 'Total': margin + 161 }
      : { '#': margin + 2, 'Description': margin + 10, 'HSN': margin + 70, 'Qty': margin + 90, 'Rate': margin + 103, 'Taxable': margin + 118, 'IGST': margin + 140, 'Total': margin + 161 }

  Object.entries(cols).forEach(([label, x]) => doc.text(label, x, y + 4.5))

  y += 7
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)

  invoice.lineItems.forEach((item, idx) => {
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    const rowBg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
    doc.rect(margin, y, contentW, 8, 'F')
    doc.text(String(idx + 1), margin + 2, y + 5)
    const desc = item.description.length > 30 ? item.description.substring(0, 28) + '..' : item.description
    doc.text(desc, margin + 10, y + 5)
    doc.text(item.hsnSac || '-', margin + 70, y + 5)
    doc.text(String(item.quantity), margin + 90, y + 5)
    if (isBillOfSupply) {
      doc.text(item.unit, margin + 103, y + 5)
      doc.text(`${item.rate.toLocaleString('en-IN')}`, margin + 118, y + 5)
      doc.text(`${item.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, margin + 155, y + 5)
    } else {
      doc.text(`${item.rate.toLocaleString('en-IN')}`, margin + 103, y + 5)
      doc.text(`${item.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, margin + 118, y + 5)
      if (intra) {
        doc.text(`${item.cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, margin + 135, y + 5)
        doc.text(`${item.sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, margin + 148, y + 5)
      } else {
        doc.text(`${item.igst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, margin + 140, y + 5)
      }
      doc.text(`${item.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, margin + 161, y + 5)
    }
    y += 8
  })

  // Totals
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, margin + contentW, y)
  y += 6

  const totalsX = margin + contentW - 60
  const totalsValueX = margin + contentW
  const addTotalRow = (label: string, value: string, bold = false) => {
    if (bold) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
    }
    doc.setTextColor(80, 80, 80)
    doc.text(label, totalsX, y)
    doc.setTextColor(20, 20, 20)
    doc.text(`Rs. ${value}`, totalsValueX, y, { align: 'right' })
    y += 5
  }

  if (!isBillOfSupply) {
    addTotalRow('Taxable Value', invoice.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
    if (intra) {
      addTotalRow('CGST', invoice.cgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
      addTotalRow('SGST', invoice.sgstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
    } else {
      addTotalRow('IGST', invoice.igstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }))
    }
    if ((invoice.cessTotal ?? 0) > 0) {
      addTotalRow('Cess', (invoice.cessTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }))
    }
  }
  if (invoice.tdsAmount && invoice.tdsAmount > 0) {
    addTotalRow(`TDS (${invoice.tdsSection || ''})`, `-${invoice.tdsAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`)
  }

  y += 2
  doc.setDrawColor(13, 148, 136)
  doc.line(totalsX - 5, y, margin + contentW, y)
  y += 3
  addTotalRow('GRAND TOTAL', invoice.grandTotal.toLocaleString('en-IN'), true)

  // Proforma watermark
  if (isProforma) {
    doc.setTextColor(200, 200, 200)
    doc.setFontSize(60)
    doc.setFont('helvetica', 'bold')
    doc.saveGraphicsState()
    doc.text('PROFORMA', 105, 148, { angle: 45, align: 'center' })
    doc.restoreGraphicsState()
  }

  y += 8

  // Bank details
  if (settings.invoiceSettings.showBankDetails && !isProforma) {
    doc.setFillColor(248, 250, 252)
    doc.rect(margin, y, contentW / 2 - 3, 22, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text('BANK DETAILS', margin + 2, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)
    doc.text(`Bank: ${settings.bankDetails.bankName}`, margin + 2, y + 10)
    doc.text(`A/C: ${settings.bankDetails.accountNumber}`, margin + 2, y + 15)
    doc.text(`IFSC: ${settings.bankDetails.ifscCode}`, margin + 2, y + 20)
    if (settings.bankDetails.upiId) {
      doc.text(`UPI: ${settings.bankDetails.upiId}`, contentW / 2 + 5, y + 10)
    }
  }

  // Notes
  if (invoice.notes) {
    y += 30
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text('Notes:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    const lines = doc.splitTextToSize(invoice.notes, contentW)
    doc.text(lines, margin, y + 5)
  }

  // E-Invoice IRN & QR Code
  if (invoice.irnQrCode && invoice.irnStatus === 'generated') {
    const qrY = 255
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text('E-Invoice (IRN):', margin, qrY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)

    // IRN Number (truncated if too long)
    const irnText = invoice.irnNumber || ''
    const truncatedIrn = irnText.length > 50 ? irnText.substring(0, 47) + '...' : irnText
    doc.text(truncatedIrn, margin, qrY + 4)
    doc.text(`Ack No: ${invoice.irnAckNo || ''}`, margin, qrY + 8)
    doc.text(`Ack Date: ${invoice.irnAckDate || ''}`, margin, qrY + 12)

    // QR Code
    try {
      doc.addImage(invoice.irnQrCode, 'PNG', pageW - margin - 25, qrY - 5, 25, 25)
    } catch (error) {
      console.error('Failed to add QR code:', error)
      // Continue without QR code
    }
  }

  // Footer
  const footerY = 285
  doc.setFillColor(13, 148, 136)
  doc.rect(0, footerY, pageW, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(settings.invoiceSettings.footerNote || 'Thank you for your business!', pageW / 2, footerY + 5, { align: 'center' })
  doc.text('Powered by Invozen GST', pageW / 2, footerY + 9, { align: 'center' })

  doc.save(`${invoice.invoiceNumber}.pdf`)
}
