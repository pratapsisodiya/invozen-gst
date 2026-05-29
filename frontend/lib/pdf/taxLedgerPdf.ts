import type { BusinessProfile } from '@/types/business'
import type { Invoice } from '@/types/invoice'
import type { PurchaseInvoice } from '@/types/purchase'
import { formatDate } from '@/lib/utils/formatters'
import { appendPdfAiAssistSection } from '@/lib/pdf/pdfAiAssist'

type Period = { month: number; year: number }

type LedgerRow = {
  label: string
  value: string
}

function getPeriodLabel(period: Period): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(period.year, period.month - 1, 1))
}

function isWithinPeriod(dateStr: string, period: Period): boolean {
  const date = new Date(dateStr)
  return date.getMonth() + 1 === period.month && date.getFullYear() === period.year
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

export async function downloadTaxLedgerPdf(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  profile: BusinessProfile,
  period: Period = { month: new Date().getMonth() + 1, year: new Date().getFullYear() }
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const pageH = 297
  const margin = 15
  const contentW = pageW - margin * 2
  const titleY = 16
  let y = 30

  const sales = invoices.filter((invoice) => invoice.status !== 'draft' && invoice.status !== 'void' && isWithinPeriod(invoice.invoiceDate, period))
  const purchaseRows = purchases.filter((purchase) => isWithinPeriod(purchase.invoiceDate, period))

  const outputTax = sales.reduce((sum, invoice) => sum + invoice.totalTax, 0)
  const salesTaxable = sales.reduce((sum, invoice) => sum + invoice.taxableValue, 0)
  const salesBalanceDue = sales.reduce((sum, invoice) => sum + invoice.balanceDue, 0)
  const purchaseTaxable = purchaseRows.reduce((sum, purchase) => sum + purchase.taxableValue, 0)
  const purchaseItcAvailable = purchaseRows.reduce((sum, purchase) => sum + purchase.itcAvailable, 0)
  const purchaseItcClaimed = purchaseRows.reduce((sum, purchase) => sum + purchase.itcClaimed, 0)
  const netPayable = Math.max(0, outputTax - purchaseItcClaimed)

  const drawText = (text: string, x: number, yPos: number, options?: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean }) => {
    doc.setFontSize(options?.size ?? 9)
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal')
    doc.text(text, x, yPos, options?.align ? { align: options.align } : undefined)
  }

  const ensureSpace = (required: number) => {
    if (y + required <= pageH - 18) return
    doc.addPage()
    y = 18
  }

  const drawMetric = (x: number, top: number, width: number, metric: LedgerRow, accent = [13, 148, 136]) => {
    doc.setFillColor(250, 250, 250)
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(x, top, width, 18, 2, 2, 'FD')
    doc.setTextColor(accent[0], accent[1], accent[2])
    drawText(metric.label, x + 3, top + 6, { size: 7.5, bold: true })
    doc.setTextColor(30, 41, 59)
    drawText(metric.value, x + 3, top + 13, { size: 10.5, bold: true })
  }

  const drawTable = (
    headers: string[],
    rows: string[][],
    widths: number[]
  ) => {
    const rowHeight = 7
    const headerHeight = 7
    const totalWidth = widths.reduce((sum, value) => sum + value, 0)

    const renderHeader = () => {
      doc.setFillColor(13, 148, 136)
      doc.rect(margin, y, totalWidth, headerHeight, 'F')
      doc.setTextColor(255, 255, 255)
      headers.forEach((header, index) => {
        const cellX = margin + widths.slice(0, index).reduce((sum, value) => sum + value, 0) + 2
        drawText(header, cellX, y + 4.8, { size: 7, bold: true })
      })
      y += headerHeight
      doc.setTextColor(30, 41, 59)
    }

    renderHeader()

    rows.forEach((row, rowIndex) => {
      ensureSpace(rowHeight + 2)
      if (y > pageH - 18 - rowHeight) {
        doc.addPage()
        y = 18
        renderHeader()
      }

      if (rowIndex % 2 === 0) {
        doc.setFillColor(249, 250, 251)
        doc.rect(margin, y, totalWidth, rowHeight, 'F')
      }

      row.forEach((cell, index) => {
        const cellX = margin + widths.slice(0, index).reduce((sum, value) => sum + value, 0) + 2
        const maxChars = Math.max(8, Math.floor(widths[index] / 1.9))
        const display = cell.length > maxChars ? `${cell.slice(0, maxChars - 2)}..` : cell
        drawText(display, cellX, y + 4.8, { size: 7 })
      })
      y += rowHeight
    })
  }

  doc.setFillColor(13, 148, 136)
  doc.rect(0, 0, pageW, 24, 'F')
  doc.setTextColor(255, 255, 255)
  drawText(profile.businessName, margin, titleY, { size: 16, bold: true })
  drawText('TAX LEDGER', pageW - margin, titleY, { size: 13, bold: true, align: 'right' })
  drawText(`GSTIN: ${profile.gstin || 'Unregistered'}`, margin, 21, { size: 8 })
  drawText(`${profile.billingAddress.city}, ${profile.billingAddress.state}`, pageW - margin, 21, { size: 8, align: 'right' })

  y = 33
  doc.setTextColor(30, 41, 59)
  drawText(`Period: ${getPeriodLabel(period)}`, margin, y, { size: 10, bold: true })
  drawText(`Prepared on ${formatDate(new Date().toISOString(), 'dd MMM yyyy')}`, pageW - margin, y, { size: 8, align: 'right' })
  y += 8

  const metricWidth = (contentW - 4) / 3
  drawMetric(margin, y, metricWidth, { label: 'Sales Taxable', value: `Rs. ${formatAmount(salesTaxable)}` })
  drawMetric(margin + metricWidth + 2, y, metricWidth, { label: 'Output GST', value: `Rs. ${formatAmount(outputTax)}` })
  drawMetric(margin + (metricWidth + 2) * 2, y, metricWidth, { label: 'Net GST Payable', value: `Rs. ${formatAmount(netPayable)}` })
  y += 23

  drawMetric(margin, y, metricWidth, { label: 'Purchase Taxable', value: `Rs. ${formatAmount(purchaseTaxable)}` }, [37, 99, 235])
  drawMetric(margin + metricWidth + 2, y, metricWidth, { label: 'ITC Available', value: `Rs. ${formatAmount(purchaseItcAvailable)}` }, [37, 99, 235])
  drawMetric(margin + (metricWidth + 2) * 2, y, metricWidth, { label: 'ITC Claimed', value: `Rs. ${formatAmount(purchaseItcClaimed)}` }, [37, 99, 235])
  y += 26

  ensureSpace(12)
  drawText('Summary', margin, y, { size: 11, bold: true })
  y += 5

  const summaryRows: LedgerRow[] = [
    { label: 'Sales invoices in period', value: String(sales.length) },
    { label: 'Purchase invoices in period', value: String(purchaseRows.length) },
    { label: 'Outstanding receivables', value: `Rs. ${formatAmount(salesBalanceDue)}` },
    { label: 'Input tax available for claim', value: `Rs. ${formatAmount(purchaseItcAvailable)}` },
  ]

  summaryRows.forEach((row) => {
    ensureSpace(6)
    drawText(row.label, margin, y, { size: 8.5 })
    drawText(row.value, pageW - margin, y, { size: 8.5, bold: true, align: 'right' })
    y += 5.5
  })

  y += 4
  ensureSpace(18)
  drawText('Sales Register', margin, y, { size: 11, bold: true })
  y += 5
  const salesRows = sales.slice(0, 12).map((invoice) => [
    invoice.invoiceNumber,
    formatDate(invoice.invoiceDate, 'dd MMM'),
    invoice.customerSnapshot.name,
    invoice.supplyType === 'intra' ? 'Intra' : 'Inter',
    `Rs. ${formatAmount(invoice.taxableValue)}`,
    `Rs. ${formatAmount(invoice.totalTax)}`,
    `Rs. ${formatAmount(invoice.grandTotal)}`,
  ])
  if (salesRows.length === 0) {
    drawText('No sales invoices found for this period.', margin, y, { size: 8.5 })
    y += 8
  } else {
    drawTable(['Invoice', 'Date', 'Customer', 'Type', 'Taxable', 'GST', 'Total'], salesRows, [25, 18, 44, 16, 25, 24, 28])
    y += 3
    if (sales.length > salesRows.length) {
      drawText(`Showing the latest ${salesRows.length} of ${sales.length} sales invoices.`, margin, y, { size: 7.5 })
      y += 5
    }
  }

  ensureSpace(18)
  drawText('Purchase Register', margin, y, { size: 11, bold: true })
  y += 5
  const purchaseTableRows = purchaseRows.slice(0, 12).map((purchase) => [
    purchase.purchaseNumber,
    formatDate(purchase.invoiceDate, 'dd MMM'),
    purchase.vendorSnapshot.name,
    `Rs. ${formatAmount(purchase.itcAvailable)}`, 
    `Rs. ${formatAmount(purchase.itcClaimed)}`,
    purchase.itcStatus,
  ])
  if (purchaseTableRows.length === 0) {
    drawText('No purchase invoices found for this period.', margin, y, { size: 8.5 })
    y += 8
  } else {
    drawTable(['Purchase', 'Date', 'Vendor', 'ITC Avail.', 'ITC Claimed', 'Status'], purchaseTableRows, [30, 18, 52, 28, 28, 24])
    y += 3
    if (purchaseRows.length > purchaseTableRows.length) {
      drawText(`Showing the latest ${purchaseTableRows.length} of ${purchaseRows.length} purchase invoices.`, margin, y, { size: 7.5 })
      y += 5
    }
  }

  y = pageH - 16
  doc.setDrawColor(229, 231, 235)
  doc.line(margin, y - 4, pageW - margin, y - 4)
  doc.setTextColor(107, 114, 128)
  drawText('Generated by Invozen GST', pageW / 2, y, { size: 7.5, align: 'center' })

  await appendPdfAiAssistSection(doc, y + 2, {
    documentType: 'Tax Ledger',
    businessName: profile.businessName,
    summary: `Tax ledger for ${getPeriodLabel(period)}. Output GST is Rs. ${outputTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })} and claimed ITC is Rs. ${purchaseItcClaimed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}.`,
    highlights: [
      `Sales registered: ${sales.length}`,
      `Purchases registered: ${purchaseRows.length}`,
      `Net payable: Rs. ${netPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    ],
    metrics: [
      { label: 'Output GST', value: `Rs. ${outputTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
      { label: 'ITC Claimed', value: `Rs. ${purchaseItcClaimed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
      { label: 'Net Payable', value: `Rs. ${netPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
    ],
  })

  doc.save(`Tax_Ledger_${period.year}_${String(period.month).padStart(2, '0')}.pdf`)
}