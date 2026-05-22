import type { CustomerStatement } from '@/lib/gst/statementGenerator'
import type { Customer } from '@/types/customer'

export async function downloadCustomerStatementPdf(
  statement: CustomerStatement,
  customer: Customer,
  businessName: string
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 15
  const contentW = pageW - margin * 2
  let y = 15

  // Teal header band
  doc.setFillColor(13, 148, 136)
  doc.rect(0, 0, pageW, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(businessName, margin, 12)

  doc.setFontSize(14)
  doc.text('ACCOUNT STATEMENT', pageW - margin, 12, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const period = `Period: ${statement.fromDate} to ${statement.toDate}`
  doc.text(period, pageW - margin, 20, { align: 'right' })
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageW - margin, 25, { align: 'right' })

  y = 40

  // Customer info block
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Customer:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(customer.name, margin + 25, y)
  y += 5

  if (customer.gstin) {
    doc.setFont('helvetica', 'bold')
    doc.text('GSTIN:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(customer.gstin, margin + 25, y)
    y += 5
  }

  if (customer.email) {
    doc.setFont('helvetica', 'bold')
    doc.text('Email:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(customer.email, margin + 25, y)
    y += 5
  }

  y += 5

  // Summary row
  doc.setFillColor(243, 244, 246)
  doc.rect(margin, y, contentW, 12, 'F')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  const col1 = margin + 2
  const col2 = margin + contentW / 3
  const col3 = margin + (contentW * 2) / 3

  y += 4
  doc.text('Opening Balance:', col1, y)
  doc.text(`Total Invoiced:`, col2, y)
  doc.text(`Total Paid:`, col3, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`₹${statement.openingBalance.toLocaleString('en-IN')}`, col1, y)
  doc.text(`₹${statement.totalInvoiced.toLocaleString('en-IN')}`, col2, y)
  doc.text(`₹${statement.totalPaid.toLocaleString('en-IN')}`, col3, y)

  y += 12

  // Table headers
  doc.setFillColor(13, 148, 136)
  doc.rect(margin, y, contentW, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const colDate = margin + 2
  const colRef = margin + 28
  const colDesc = margin + 58
  const colDebit = margin + 118
  const colCredit = margin + 140
  const colBal = margin + 162
  doc.text('Date', colDate, y + 5)
  doc.text('Reference', colRef, y + 5)
  doc.text('Description', colDesc, y + 5)
  doc.text('Debit', colDebit, y + 5)
  doc.text('Credit', colCredit, y + 5)
  doc.text('Balance', colBal, y + 5)
  y += 10

  // Rows
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  let rowFill = false

  for (const entry of statement.entries) {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    if (rowFill) {
      doc.setFillColor(249, 250, 251)
      doc.rect(margin, y - 1, contentW, 7, 'F')
    }
    rowFill = !rowFill
    doc.setFontSize(7.5)
    doc.text(entry.date, colDate, y + 4)
    doc.text(entry.reference.slice(0, 14), colRef, y + 4)
    doc.text(entry.description.slice(0, 30), colDesc, y + 4)
    if (entry.debit > 0) doc.text(`₹${entry.debit.toLocaleString('en-IN')}`, colDebit, y + 4)
    if (entry.credit > 0) {
      doc.setTextColor(5, 150, 105)
      doc.text(`₹${entry.credit.toLocaleString('en-IN')}`, colCredit, y + 4)
      doc.setTextColor(30, 30, 30)
    }
    const balColor = entry.balance > 0 ? [220, 38, 38] : [5, 150, 105]
    doc.setTextColor(balColor[0], balColor[1], balColor[2])
    doc.text(`₹${Math.abs(entry.balance).toLocaleString('en-IN')}`, colBal, y + 4)
    doc.setTextColor(30, 30, 30)
    y += 7
  }

  y += 5

  // Closing balance
  doc.setFillColor(13, 148, 136)
  doc.rect(margin, y, contentW, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Closing Balance:', colBal - 30, y + 7)
  doc.text(`₹${statement.closingBalance.toLocaleString('en-IN')}`, colBal, y + 7)

  // Footer
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('This is a computer-generated statement.', pageW / 2, 290, { align: 'center' })

  doc.save(`Statement_${customer.name.replace(/\s+/g, '_')}_${statement.fromDate}_${statement.toDate}.pdf`)
}
