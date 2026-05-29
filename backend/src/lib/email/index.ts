import { ID } from 'node-appwrite'
import { appwriteUsers, appwriteMessaging, isAppwriteConfigured } from '../appwrite.js'

interface InvoiceEmailResult {
  sent: boolean
  reason?: string
}

/**
 * Sends a transactional invoice email to a customer using Appwrite Messaging.
 * Fallbacks to simulation mode if Appwrite credentials are not set.
 */
export async function sendInvoiceEmail(
  invoice: any,
  businessData: any, // { profile: BusinessProfile, settings: AppSettings }
  toEmail: string
): Promise<InvoiceEmailResult> {
  const profile = businessData?.profile || {}
  const settings = businessData?.settings || {}

  const invoiceNumber = invoice.invoiceNumber
  const customerName = invoice.customerSnapshot?.name || 'Customer'
  const grandTotal = invoice.grandTotal || 0
  const balanceDue = invoice.balanceDue ?? grandTotal
  const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : 'N/A'
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'
  const businessName = profile.businessName || 'Our Business'
  const supplyType = invoice.supplyType === 'intra' ? 'Intra-State' : 'Inter-State'

  // Build line items rows
  const lineItems = invoice.lineItems || []
  const isIntra = invoice.supplyType === 'intra'

  let itemsHtml = ''
  lineItems.forEach((item: any, idx: number) => {
    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
    const name = item.description || 'Line Item'
    const qty = item.quantity || 0
    const rate = (item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const taxableValue = (item.taxableValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const cgst = isIntra ? (item.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
    const sgst = isIntra ? (item.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
    const igst = !isIntra ? (item.igst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
    const totalAmount = (item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    itemsHtml += `
      <tr style="background-color: ${rowBg}; border-top: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-size: 13px; color: #334155;">${idx + 1}</td>
        <td style="padding: 10px; font-size: 13px; color: #1e293b; font-weight: 500;">
          ${name}
          <div style="font-size: 11px; color: #64748b;">${item.unit || 'unit'} · GST ${item.gstRate || 0}%</div>
        </td>
        <td style="padding: 10px; font-size: 13px; color: #475569; font-family: monospace;">${item.hsnSac || '-'}</td>
        <td style="padding: 10px; font-size: 13px; color: #334155; text-align: center;">${qty}</td>
        <td style="padding: 10px; font-size: 13px; color: #334155; text-align: right;">₹${rate}</td>
        <td style="padding: 10px; font-size: 13px; color: #334155; text-align: right;">₹${taxableValue}</td>
        ${isIntra ? `
          <td style="padding: 10px; font-size: 13px; color: #64748b; text-align: right;">₹${cgst}</td>
          <td style="padding: 10px; font-size: 13px; color: #64748b; text-align: right;">₹${sgst}</td>
        ` : `
          <td style="padding: 10px; font-size: 13px; color: #64748b; text-align: right;">₹${igst}</td>
        `}
        <td style="padding: 10px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">₹${totalAmount}</td>
      </tr>
    `
  })

  // Build Bank Details Html
  let bankDetailsHtml = ''
  if (settings.invoiceSettings?.showBankDetails && settings.bankDetails?.bankName) {
    const bank = settings.bankDetails
    bankDetailsHtml = `
      <div style="margin-top: 25px; padding: 15px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase;">Bank Transfer Details</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 3px 0; color: #64748b; width: 120px;">Bank Name</td>
            <td style="padding: 3px 0; color: #1e293b; font-weight: 500;">${bank.bankName}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Account Name</td>
            <td style="padding: 3px 0; color: #1e293b;">${bank.accountName}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Account Number</td>
            <td style="padding: 3px 0; color: #1e293b; font-family: monospace; font-weight: 600;">${bank.accountNumber}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">IFSC Code</td>
            <td style="padding: 3px 0; color: #1e293b; font-family: monospace; font-weight: 600; color: #0d9488;">${bank.ifscCode}</td>
          </tr>
          ${bank.upiId ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;">UPI ID</td>
            <td style="padding: 3px 0; color: #0d9488; font-weight: 500;">${bank.upiId}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `
  }

  // Build the email template
  const subject = `Invoice ${invoiceNumber} from ${businessName}`
  const logoHeader = profile.logoUrl 
    ? `<img src="${profile.logoUrl}" alt="${businessName}" style="max-height: 50px; display: block; margin-bottom: 15px;" />`
    : `<h1 style="margin: 0 0 10px 0; font-size: 24px; color: #ffffff; font-weight: 800;">${businessName}</h1>`

  const emailBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table style="width: 100%; border-collapse: collapse; background-color: #f1f5f9; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table style="max-width: 650px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); text-align: left;">
              <!-- Color Header Banner -->
              <tr>
                <td style="background-color: #0d9488; padding: 30px; color: #ffffff;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td>
                        ${logoHeader}
                        <div style="font-size: 13px; opacity: 0.9;">GSTIN: ${profile.gstin || 'Unregistered'}</div>
                      </td>
                      <td style="text-align: right; vertical-align: top;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.05em;">TAX INVOICE</h2>
                        <div style="font-size: 14px; font-family: monospace; margin-top: 5px; opacity: 0.95;">#${invoiceNumber}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Greeting & Highlights -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                    Dear <strong>${customerName}</strong>,
                  </p>
                  <p style="margin: 0 0 25px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                    Please find the invoice summary below. You can make the payment online or via bank transfer by the due date.
                  </p>

                  <!-- Invoice Meta Card -->
                  <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 25px;">
                    <tr>
                      <td style="padding: 15px; width: 25%; border-right: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Date</div>
                        <div style="font-size: 13px; font-weight: 700; color: #334155; margin-top: 3px;">${invoiceDate}</div>
                      </td>
                      <td style="padding: 15px; width: 25%; border-right: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Due Date</div>
                        <div style="font-size: 13px; font-weight: 700; color: #0d9488; margin-top: 3px;">${dueDate}</div>
                      </td>
                      <td style="padding: 15px; width: 25%; border-right: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Supply Type</div>
                        <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 3px;">${supplyType}</div>
                      </td>
                      <td style="padding: 15px; width: 25%; text-align: right;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Balance Due</div>
                        <div style="font-size: 15px; font-weight: 800; color: #e11d48; margin-top: 3px;">₹${balanceDue.toLocaleString('en-IN')}</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Party Details -->
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <tr>
                      <td style="width: 50%; vertical-align: top; padding-right: 15px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Bill From</h4>
                        <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${profile.legalName || businessName}</div>
                        <div style="font-size: 12px; color: #475569; margin-top: 3px; line-height: 1.4;">
                          ${profile.billingAddress?.line1 || ''}<br/>
                          ${profile.billingAddress?.city || ''}, ${profile.billingAddress?.state || ''} - ${profile.billingAddress?.pincode || ''}<br/>
                          Email: ${profile.email || '-'}<br/>
                          Phone: ${profile.phone || '-'}
                        </div>
                      </td>
                      <td style="width: 50%; vertical-align: top; padding-left: 15px; border-left: 1px solid #e2e8f0;">
                        <h4 style="margin: 0 0 8px 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Bill To</h4>
                        <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${customerName}</div>
                        <div style="font-size: 12px; color: #475569; margin-top: 3px; line-height: 1.4;">
                          GSTIN: ${invoice.customerSnapshot?.gstin || 'Unregistered'}<br/>
                          State: ${invoice.customerSnapshot?.state || '-'}<br/>
                          Email: ${toEmail}
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Items Table -->
                  <h4 style="margin: 0 0 10px 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Invoice Items</h4>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                    <thead>
                      <tr style="background-color: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                        <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left; font-weight: 700; width: 30px;">#</th>
                        <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left; font-weight: 700;">Description</th>
                        <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left; font-weight: 700; width: 60px;">HSN</th>
                        <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: center; font-weight: 700; width: 40px;">Qty</th>
                        <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: right; font-weight: 700; width: 80px;">Rate</th>
                        <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: right; font-weight: 700; width: 80px;">Taxable</th>
                        ${isIntra ? `
                          <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: right; font-weight: 700; width: 65px;">CGST</th>
                          <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: right; font-weight: 700; width: 65px;">SGST</th>
                        ` : `
                          <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: right; font-weight: 700; width: 80px;">IGST</th>
                        `}
                        <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: right; font-weight: 700; width: 90px;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>

                  <!-- Totals -->
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                    <tr>
                      <td style="width: 50%; vertical-align: top;">
                        ${invoice.notes ? `
                          <div style="font-size: 12px; color: #64748b; line-height: 1.4; padding-right: 20px;">
                            <strong>Notes:</strong><br/>
                            ${invoice.notes}
                          </div>
                        ` : ''}
                      </td>
                      <td style="width: 50%; vertical-align: top;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                          <tr>
                            <td style="padding: 4px 0; color: #64748b;">Taxable Subtotal</td>
                            <td style="padding: 4px 0; text-align: right; color: #334155; font-family: monospace;">₹${(invoice.taxableValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          ${isIntra ? `
                            <tr>
                              <td style="padding: 4px 0; color: #64748b;">CGST Total</td>
                              <td style="padding: 4px 0; text-align: right; color: #334155; font-family: monospace;">₹${(invoice.cgstTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #64748b;">SGST Total</td>
                              <td style="padding: 4px 0; text-align: right; color: #334155; font-family: monospace;">₹${(invoice.sgstTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ` : `
                            <tr>
                              <td style="padding: 4px 0; color: #64748b;">IGST Total</td>
                              <td style="padding: 4px 0; text-align: right; color: #334155; font-family: monospace;">₹${(invoice.igstTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          `}
                          ${(invoice.cessTotal ?? 0) > 0 ? `
                            <tr>
                              <td style="padding: 4px 0; color: #64748b;">GST Cess</td>
                              <td style="padding: 4px 0; text-align: right; color: #334155; font-family: monospace;">₹${(invoice.cessTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ` : ''}
                          ${invoice.tdsAmount && invoice.tdsAmount > 0 ? `
                            <tr>
                              <td style="padding: 4px 0; color: #e11d48;">Less: TDS (${invoice.tdsSection || ''})</td>
                              <td style="padding: 4px 0; text-align: right; color: #e11d48; font-family: monospace;">-₹${(invoice.tdsAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ` : ''}
                          <tr style="border-top: 2px solid #0d9488;">
                            <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #0f172a;">Grand Total</td>
                            <td style="padding: 8px 0; text-align: right; font-size: 16px; font-weight: 800; color: #0d9488; font-family: monospace;">₹${grandTotal.toLocaleString('en-IN')}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Bank Details Block -->
                  ${bankDetailsHtml}

                  ${settings.invoiceSettings?.termsAndConditions ? `
                    <div style="margin-top: 20px; font-size: 11px; color: #94a3b8; line-height: 1.4; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                      <strong>Terms & Conditions:</strong> ${settings.invoiceSettings.termsAndConditions}
                    </div>
                  ` : ''}
                </td>
              </tr>

              <!-- Footer Section -->
              <tr>
                <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #f1f5f9;">
                  <p style="margin: 0; font-size: 12px; color: #64748b;">
                    Thank you for your business! If you have any questions, feel free to reply to this email.
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">
                    Powered by Invozen GST
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  if (!isAppwriteConfigured) {
    console.log('\n============================================================')
    console.log(`📡 [MOCK EMAIL SIMULATION]`)
    console.log(`To: ${toEmail}`)
    console.log(`Subject: ${subject}`)
    console.log(`Invoice Details: ${invoiceNumber} - Total ₹${grandTotal}`)
    console.log('============================================================\n')

    return {
      sent: true,
      reason: 'Simulation Mode: Appwrite credentials not configured. Email logged to console.',
    }
  }

  try {
    // 1. Check or Create User in Appwrite deterministically
    const rawUserId = `customer_${invoice.customerId}`
    const userId = rawUserId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 36) // Keep it valid Appwrite ID

    let userExists = false
    try {
      await appwriteUsers.get(userId)
      userExists = true
    } catch (e: any) {
      if (e.code !== 404) {
        throw e
      }
    }

    if (!userExists) {
      await appwriteUsers.create({
        userId,
        email: toEmail,
        name: customerName,
      })
    }

    // 2. Check or Create Target for the user email
    const targetsList = await appwriteUsers.listTargets({ userId })
    let target = targetsList.targets.find(
      (t: any) => t.providerType === 'email' && t.identifier === toEmail
    )

    let targetId = target?.['$id']

    if (!targetId) {
      const newTarget = await appwriteUsers.createTarget({
        userId,
        targetId: ID.unique(),
        providerType: 'email' as any,
        identifier: toEmail,
        name: `Billing: ${customerName}`,
      })
      targetId = newTarget['$id']
    }

    // 3. Send email via Messaging
    await appwriteMessaging.createEmail({
      messageId: ID.unique(),
      subject,
      content: emailBody,
      targets: [targetId],
    })

    return {
      sent: true,
      reason: `Email successfully sent to ${toEmail} using Appwrite Messaging.`,
    }
  } catch (error: any) {
    console.error('Appwrite Email Error:', error)
    throw new Error(error.message || 'Appwrite Messaging service failed to send email')
  }
}
