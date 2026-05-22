import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { toJson } from '../lib/prisma.js'
import { ok, created, notFound, badRequest } from '../lib/response.js'
import { RazorpayService } from '../lib/payments/razorpay.js'
import { generateId } from '../lib/id.js'
import { z } from 'zod'

const router = Router()

/**
 * Payment Gateway Routes
 *
 * Handles online payment collection via Razorpay
 * including payment link generation and webhook processing
 */

const createPaymentLinkSchema = z.object({
  invoiceId: z.string().uuid(),
  notifyCustomer: z.boolean().optional(),
  expiryDays: z.number().min(1).max(30).optional(),
})

// POST /payment-gateway/create-link - Create payment link for invoice
router.post('/create-link', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const validated = createPaymentLinkSchema.parse(req.body)

    // Get invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: validated.invoiceId, userId },
    })

    if (!invoice) {
      return notFound(res, 'Invoice not found')
    }

    const invoiceData = invoice.data as any

    // Check if invoice is already paid
    if (invoiceData.status === 'paid') {
      return badRequest(res, 'Invoice is already paid')
    }

    // Calculate amount due
    const amountDue = invoiceData.balanceDue || invoiceData.grandTotal
    if (amountDue <= 0) {
      return badRequest(res, 'No amount due on this invoice')
    }

    // Get business profile for callback URL
    const business = await prisma.businessProfile.findUnique({ where: { userId } })
    const businessData = business?.data as any

    // Create payment link
    const razorpay = new RazorpayService()
    const expiryTimestamp = validated.expiryDays
      ? Math.floor(Date.now() / 1000) + validated.expiryDays * 24 * 60 * 60
      : undefined

    const paymentLink = await razorpay.createPaymentLink({
      amount: Math.round(amountDue * 100), // Convert to paise
      currency: invoiceData.currency || 'INR',
      invoiceId: validated.invoiceId,
      customerId: invoiceData.customerId,
      customerName: invoiceData.customerSnapshot?.name || 'Customer',
      customerEmail: invoiceData.customerSnapshot?.email,
      customerPhone: invoiceData.customerSnapshot?.phone,
      description: `Payment for Invoice ${invoiceData.invoiceNumber}`,
      callbackUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success`,
      notifyEmail: validated.notifyCustomer !== false,
      notifySms: validated.notifyCustomer !== false,
      reminderEnable: true,
      expireBy: expiryTimestamp,
    })

    // Update invoice with payment link
    const updated = {
      ...invoiceData,
      paymentLink: paymentLink.shortUrl,
      paymentLinkId: paymentLink.id,
      paymentLinkCreatedAt: new Date().toISOString(),
      paymentLinkExpireBy: expiryTimestamp
        ? new Date(expiryTimestamp * 1000).toISOString()
        : null,
    }

    await prisma.invoice.update({
      where: { id: validated.invoiceId },
      data: { data: toJson(updated), updatedAt: new Date() },
    })

    // Audit log
    await prisma.auditEntry.create({
      data: {
        id: generateId(),
        userId,
        entity: 'invoice',
        entityId: validated.invoiceId,
        action: 'create_payment_link',
        data: toJson({
          paymentLinkId: paymentLink.id,
          amount: amountDue,
          expiry: expiryTimestamp,
        }),
      },
    })

    created(res, {
      paymentLink: paymentLink.shortUrl,
      paymentLinkId: paymentLink.id,
      amount: amountDue,
      currency: invoiceData.currency || 'INR',
      status: paymentLink.status,
      expiresAt: expiryTimestamp
        ? new Date(expiryTimestamp * 1000).toISOString()
        : null,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return badRequest(res, err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '))
    }
    next(err)
  }
})

// POST /payment-gateway/webhook - Razorpay webhook handler
router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string
    const payload = JSON.stringify(req.body)

    // Verify webhook signature
    const razorpay = new RazorpayService()
    const isValid = razorpay.verifyWebhookSignature(payload, signature)

    if (!isValid) {
      console.error('Invalid webhook signature')
      return res.status(400).json({ error: 'Invalid signature' })
    }

    // Parse webhook
    const webhook = razorpay.parseWebhook(payload)
    console.log('Razorpay webhook received:', webhook.event)

    // Handle different webhook events
    switch (webhook.event) {
      case 'payment.captured':
      case 'payment_link.paid':
        await handlePaymentSuccess(webhook)
        break

      case 'payment.failed':
        await handlePaymentFailed(webhook)
        break

      case 'refund.created':
        await handleRefund(webhook)
        break

      default:
        console.log('Unhandled webhook event:', webhook.event)
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ status: 'ok' })
  } catch (err) {
    console.error('Webhook processing error:', err)
    // Still return 200 to prevent retries
    res.status(200).json({ status: 'error', message: (err as Error).message })
  }
})

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(webhook: any) {
  const payment = webhook.payload.payment.entity
  const invoiceId = payment.notes?.invoice_id || payment.invoice_id

  if (!invoiceId) {
    console.error('No invoice_id in payment:', payment.id)
    return
  }

  // Get invoice
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId } })
  if (!invoice) {
    console.error('Invoice not found:', invoiceId)
    return
  }

  const invoiceData = invoice.data as any

  // Create payment record
  const paymentId = generateId()
  const paymentAmount = payment.amount / 100 // Convert from paise to rupees

  await prisma.payment.create({
    data: {
      id: paymentId,
      userId: invoice.userId,
      invoiceId,
      customerId: invoiceData.customerId,
      paymentDate: new Date(payment.created_at * 1000).toISOString(),
      data: toJson({
        amount: paymentAmount,
        method: payment.method,
        paymentId: payment.id,
        orderId: payment.order_id,
        status: 'success',
        currency: payment.currency,
        captured: payment.captured,
        email: payment.email,
        contact: payment.contact,
        razorpaySignature: payment.signature,
        createdAt: new Date().toISOString(),
      }),
    },
  })

  // Update invoice status
  const newAmountPaid = (invoiceData.amountPaid || 0) + paymentAmount
  const newBalanceDue = invoiceData.grandTotal - newAmountPaid
  const newStatus = newBalanceDue <= 0 ? 'paid' : 'sent'

  const updated = {
    ...invoiceData,
    amountPaid: newAmountPaid,
    balanceDue: newBalanceDue,
    status: newStatus,
    paidAt: newStatus === 'paid' ? new Date().toISOString() : invoiceData.paidAt,
    lastPaymentAt: new Date().toISOString(),
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: newStatus, data: toJson(updated), updatedAt: new Date() },
  })

  // Audit log
  await prisma.auditEntry.create({
    data: {
      id: generateId(),
      userId: invoice.userId,
      entity: 'payment',
      entityId: paymentId,
      action: 'payment_received',
      data: toJson({
        invoiceId,
        amount: paymentAmount,
        method: payment.method,
        razorpayPaymentId: payment.id,
        via: 'razorpay_webhook',
      }),
    },
  })

  console.log(`Payment recorded: ₹${paymentAmount} for invoice ${invoiceData.invoiceNumber}`)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(webhook: any) {
  const payment = webhook.payload.payment.entity
  const invoiceId = payment.notes?.invoice_id

  if (!invoiceId) return

  // Log failed attempt
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId } })
  if (!invoice) return

  await prisma.auditEntry.create({
    data: {
      id: generateId(),
      userId: invoice.userId,
      entity: 'invoice',
      entityId: invoiceId,
      action: 'payment_failed',
      data: toJson({
        razorpayPaymentId: payment.id,
        method: payment.method,
        errorCode: payment.error_code,
        errorDescription: payment.error_description,
        failedAt: new Date(payment.created_at * 1000).toISOString(),
      }),
    },
  })

  console.log(`Payment failed for invoice ${invoiceId}:`, payment.error_description)
}

/**
 * Handle refund
 */
async function handleRefund(webhook: any) {
  const refund = webhook.payload.refund.entity
  const paymentId = refund.payment_id

  // Find payment record — SQLite doesn't support JSON path filters, so filter in JS
  const allPayments = await prisma.payment.findMany({ take: 1000 })
  const payment = allPayments.find(p => (p.data as Record<string, unknown>)?.['paymentId'] === paymentId)

  if (!payment) {
    console.error('Payment not found for refund:', paymentId)
    return
  }

  const paymentData = payment.data as any
  const refundAmount = refund.amount / 100

  // Update payment record
  const updated = {
    ...paymentData,
    refunded: true,
    refundAmount,
    refundId: refund.id,
    refundedAt: new Date(refund.created_at * 1000).toISOString(),
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { data: toJson(updated) },
  })

  // Update invoice
  const invoice = await prisma.invoice.findFirst({ where: { id: payment.invoiceId } })
  if (invoice) {
    const invoiceData = invoice.data as any
    const newAmountPaid = (invoiceData.amountPaid || 0) - refundAmount
    const newBalanceDue = invoiceData.grandTotal - newAmountPaid

    const updatedInvoice = {
      ...invoiceData,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newBalanceDue > 0 ? 'sent' : 'paid',
    }

    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { data: toJson(updatedInvoice), updatedAt: new Date() },
    })
  }

  // Audit log
  await prisma.auditEntry.create({
    data: {
      id: generateId(),
      userId: payment.userId,
      entity: 'payment',
      entityId: payment.id,
      action: 'refund_processed',
      data: toJson({
        refundId: refund.id,
        amount: refundAmount,
        razorpayPaymentId: paymentId,
      }),
    },
  })

  console.log(`Refund processed: ₹${refundAmount} for payment ${paymentId}`)
}

// GET /payment-gateway/status/:invoiceId - Get payment link status
router.get('/status/:invoiceId', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.invoiceId as string, userId },
    })

    if (!invoice) {
      return notFound(res, 'Invoice not found')
    }

    const invoiceData = invoice.data as any

    ok(res, {
      invoiceNumber: invoiceData.invoiceNumber,
      amount: invoiceData.grandTotal,
      amountPaid: invoiceData.amountPaid || 0,
      balanceDue: invoiceData.balanceDue || invoiceData.grandTotal,
      status: invoiceData.status,
      paymentLink: invoiceData.paymentLink,
      paymentLinkId: invoiceData.paymentLinkId,
      paymentLinkCreatedAt: invoiceData.paymentLinkCreatedAt,
      paymentLinkExpireBy: invoiceData.paymentLinkExpireBy,
    })
  } catch (err) {
    next(err)
  }
})

export default router
