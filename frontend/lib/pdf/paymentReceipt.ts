import type { Payment } from '@/types/payment'
import type { Invoice } from '@/types/invoice'
import type { Customer } from '@/types/customer'
import type { BusinessProfile } from '@/types/business'
import { PAYMENT_METHOD_LABELS } from '@/types/payment'
import { formatAmountInWords } from '@/lib/gst/formatter'
import { appendPdfAiAssistSection } from '@/lib/pdf/pdfAiAssist'

export async function downloadPaymentReceiptPdf(
  payment: Payment,
  invoices: Invoice[],
  customer: Customer,
  profile: BusinessProfile,
  receiptNumber: string
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 15
  const contentW = pageW - margin * 2
  let y = 0

  // Teal header band
  doc.setFillColor(13, 148, 136)
  doc.rect(0, 0, pageW, 34, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(profile.businessName, margin, 12)

  doc.setFontSize(13)
  doc.text('PAYMENT RECEIPT', pageW - margin, 12, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  if (profile.gstin) doc.text(`GSTIN: ${profile.gstin}`, margin, 20)
  if (profile.phone) doc.text(`Phone: ${profile.phone}`, margin, 26)
  doc.text(`Receipt No: ${receiptNumber}`, pageW - margin, 20, { align: 'right' })
  doc.text(`Date: ${new Date(payment.paymentDate).toLocaleDateString('en-IN')}`, pageW - margin, 26, { align: 'right' })

  y = 44

  // Received from block
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  const labelW = 30
  const valueX = margin + labelW

  const addField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, valueX, y)
    y += 5
  }

  addField('Received From', customer.name)
  if (customer.businessName) addField('Business', customer.businessName)
  if (customer.gstin) addField('GSTIN', customer.gstin)
  if (customer.phone) addField('Phone', customer.phone)

  y += 4

  // Payment method bar
  doc.setFillColor(243, 244, 246)
  doc.rect(margin, y, contentW, 10, 'F')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Payment Mode:', margin + 3, y + 6.5)
  doc.setFont('helvetica', 'normal')
  doc.text(PAYMENT_METHOD_LABELS[payment.method], margin + 35, y + 6.5)
  if (payment.reference) {
    doc.setFont('helvetica', 'bold')
    doc.text('Ref / UTR:', margin + 85, y + 6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(payment.reference, margin + 105, y + 6.5)
  }
  y += 15

  // Settled invoices table header
  doc.setFillColor(13, 148, 136)
  doc.rect(margin, y, contentW, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const c1 = margin + 3
  const c2 = margin + 50
  const c3 = margin + 95
  const c4 = margin + 145
  doc.text('Invoice #', c1, y + 5)
  doc.text('Invoice Date', c2, y + 5)
  doc.text('Invoice Total', c3, y + 5)
  doc.text('Amount Paid', c4, y + 5)
  y += 10

  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'normal')
  let rowFill = false
  for (const inv of invoices) {
    if (rowFill) {
      doc.setFillColor(249, 250, 251)
      doc.rect(margin, y - 1, contentW, 7, 'F')
    }
    rowFill = !rowFill
    doc.setFontSize(7.5)
    doc.text(inv.invoiceNumber, c1, y + 4)
    doc.text(new Date(inv.invoiceDate).toLocaleDateString('en-IN'), c2, y + 4)
    doc.text(`Rs.${inv.grandTotal.toLocaleString('en-IN')}`, c3, y + 4)
    doc.text(`Rs.${payment.amount.toLocaleString('en-IN')}`, c4, y + 4)
    y += 7
  }

  y += 10

  // Total paid — large teal band
  doc.setFillColor(13, 148, 136)
  doc.rect(margin, y, contentW, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Total Amount Received:', margin + 3, y + 7)
  doc.setFontSize(18)
  doc.text(`Rs.${payment.amount.toLocaleString('en-IN')}`, pageW - margin, y + 9, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.text(formatAmountInWords(payment.amount), margin + 3, y + 16)

  y += 28

  // Thank you
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Thank you for your payment!', pageW / 2, y, { align: 'center' })
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(150, 150, 150)
  doc.text('This is a computer-generated receipt. No signature required.', pageW / 2, y, { align: 'center' })

  await appendPdfAiAssistSection(doc, y + 4, {
    documentType: 'Payment Receipt',
    businessName: profile.businessName,
    summary: `Receipt ${receiptNumber} records Rs. ${payment.amount.toLocaleString('en-IN')} received from ${customer.name}. The payment method is ${PAYMENT_METHOD_LABELS[payment.method]}.`,
    highlights: [
      `Receipt date: ${new Date(payment.paymentDate).toLocaleDateString('en-IN')}`,
      `Method: ${PAYMENT_METHOD_LABELS[payment.method]}`,
      `Invoices covered: ${invoices.length}`,
    ],
    metrics: [
      { label: 'Amount Received', value: `Rs. ${payment.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
      { label: 'Customer', value: customer.name },
      { label: 'Invoices', value: String(invoices.length) },
    ],
  })

  doc.save(`Receipt_${receiptNumber}.pdf`)
}
