import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import type { Invoice } from '@/lib/types/invoice'
import { formatDate, formatCurrency } from '@/lib/utils/formatters'

export async function generateInvoicePDF(invoice: Invoice): Promise<string> {
  const html = buildInvoiceHTML(invoice)

  const { uri } = await Print.printToFileAsync({
    html,
    width: 595,  // A4 width in points
    height: 842, // A4 height in points
  })

  return uri
}

export async function shareInvoicePDF(invoice: Invoice): Promise<void> {
  const pdfUri = await generateInvoicePDF(invoice)

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice ${invoice.invoiceNumber}`,
      UTI: 'com.adobe.pdf',
    })
  } else {
    throw new Error('Sharing is not available on this device')
  }
}

function buildInvoiceHTML(invoice: Invoice): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; font-size: 12px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #7C3AED; font-size: 24px; margin-bottom: 5px; }
    .invoice-title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
    .info-section { margin-bottom: 20px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .info-box { flex: 1; }
    .info-box h3 { font-size: 11px; color: #666; margin-bottom: 8px; }
    .info-box p { margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 11px; border-bottom: 2px solid #ddd; }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    .amount { text-align: right; }
    .totals { margin-left: auto; width: 50%; margin-top: 20px; }
    .totals table { margin: 0; }
    .totals td { padding: 8px 10px; }
    .totals .grand-total { font-size: 14px; font-weight: bold; background: #f3f4f6; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVOZEN GST</h1>
    <p>GST Invoicing Made Simple</p>
  </div>

  <div class="invoice-title">TAX INVOICE</div>

  <div class="info-row">
    <div class="info-box">
      <h3>BILL TO</h3>
      <p><strong>${invoice.customerSnapshot.name}</strong></p>
      ${invoice.customerSnapshot.gstin ? `<p>GSTIN: ${invoice.customerSnapshot.gstin}</p>` : ''}
      <p>${invoice.customerSnapshot.address}</p>
      <p>${invoice.customerSnapshot.state}</p>
    </div>
    <div class="info-box" style="text-align: right;">
      <h3>INVOICE DETAILS</h3>
      <p><strong>${invoice.invoiceNumber}</strong></p>
      <p>Date: ${formatDate(invoice.invoiceDate)}</p>
      <p>Due Date: ${formatDate(invoice.dueDate)}</p>
      <p>Place of Supply: ${invoice.placeOfSupply}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>HSN/SAC</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>GST</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lineItems.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description}</td>
          <td>${item.hsnSac}</td>
          <td>${item.quantity} ${item.unit}</td>
          <td>₹${formatCurrency(item.rate)}</td>
          <td>${item.gstRate}%</td>
          <td class="amount">₹${formatCurrency(item.totalAmount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Subtotal</td>
        <td class="amount">₹${formatCurrency(invoice.subtotal)}</td>
      </tr>
      ${invoice.discountAmount > 0 ? `
      <tr>
        <td>Discount</td>
        <td class="amount">- ₹${formatCurrency(invoice.discountAmount)}</td>
      </tr>` : ''}
      <tr>
        <td>Taxable Value</td>
        <td class="amount">₹${formatCurrency(invoice.taxableValue)}</td>
      </tr>
      ${invoice.cgstTotal > 0 ? `
      <tr>
        <td>CGST</td>
        <td class="amount">₹${formatCurrency(invoice.cgstTotal)}</td>
      </tr>
      <tr>
        <td>SGST</td>
        <td class="amount">₹${formatCurrency(invoice.sgstTotal)}</td>
      </tr>` : ''}
      ${invoice.igstTotal > 0 ? `
      <tr>
        <td>IGST</td>
        <td class="amount">₹${formatCurrency(invoice.igstTotal)}</td>
      </tr>` : ''}
      <tr class="grand-total">
        <td><strong>Grand Total</strong></td>
        <td class="amount"><strong>₹${formatCurrency(invoice.grandTotal)}</strong></td>
      </tr>
    </table>
  </div>

  ${invoice.notes ? `<div style="margin-top: 30px;"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

  <div class="footer">
    <p>Generated with Invozen GST Mobile App</p>
  </div>
</body>
</html>
  `
}
