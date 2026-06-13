import Razorpay from 'razorpay'
import crypto from 'crypto'
import { config } from '../../config'

/**
 * Razorpay Payment Gateway Integration
 *
 * Enables online payment collection for invoices via payment links
 * and automatic payment reconciliation via webhooks
 */

export interface PaymentLinkOptions {
  amount: number // in paise (₹100 = 10000 paise)
  currency?: string
  invoiceId: string
  customerId: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  description: string
  callbackUrl?: string
  notifyEmail?: boolean
  notifySms?: boolean
  reminderEnable?: boolean
  expireBy?: number // Unix timestamp
}

export interface PaymentLinkResponse {
  id: string
  shortUrl: string
  amount: number
  currency: string
  status: string
  description: string
  createdAt: number
}

export interface WebhookPayload {
  event: string
  payload: {
    payment: {
      entity: {
        id: string
        amount: number
        currency: string
        status: string
        order_id: string
        invoice_id?: string
        method: string
        captured: boolean
        email: string
        contact: string
        created_at: number
      }
    }
  }
}

export class RazorpayService {
  private razorpay: Razorpay

  constructor() {
    if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured')
    }

    this.razorpay = new Razorpay({
      key_id: config.RAZORPAY_KEY_ID,
      key_secret: config.RAZORPAY_KEY_SECRET,
    })
  }

  /**
   * Create payment link for an invoice
   */
  async createPaymentLink(options: PaymentLinkOptions): Promise<PaymentLinkResponse> {
    try {
      const response = await this.razorpay.paymentLink.create({
        amount: options.amount,
        currency: options.currency || 'INR',
        description: options.description,
        customer: {
          name: options.customerName,
          email: options.customerEmail,
          contact: options.customerPhone,
        },
        notify: {
          sms: options.notifySms !== false,
          email: options.notifyEmail !== false,
        },
        reminder_enable: options.reminderEnable !== false,
        callback_url: options.callbackUrl,
        callback_method: 'get',
        expire_by: options.expireBy,
        reference_id: options.invoiceId, // Link to invoice
        notes: {
          invoice_id: options.invoiceId,
          customer_id: options.customerId,
        },
      })

      return {
        id: response.id as string,
        shortUrl: (response.short_url || '') as string,
        amount: Number(response.amount),
        currency: (response.currency || 'INR') as string,
        status: (response.status || '') as string,
        description: (response.description || '') as string,
        createdAt: Number(response.created_at) || 0,
      }
    } catch (error) {
      console.error('Razorpay payment link creation failed:', error)
      throw new Error(`Failed to create payment link: ${(error as Error).message}`)
    }
  }

  /**
   * Verify webhook signature to ensure it came from Razorpay
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      )
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return false
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: string): WebhookPayload {
    return JSON.parse(payload)
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string) {
    try {
      return await this.razorpay.payments.fetch(paymentId)
    } catch (error) {
      console.error('Failed to fetch payment:', error)
      throw new Error(`Failed to fetch payment: ${(error as Error).message}`)
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number) {
    try {
      return await this.razorpay.payments.refund(paymentId, {
        amount, // If not provided, full refund
        speed: 'normal', // or 'optimum' for instant refund
      })
    } catch (error) {
      console.error('Failed to refund payment:', error)
      throw new Error(`Failed to refund payment: ${(error as Error).message}`)
    }
  }

  /**
   * Cancel a payment link
   */
  async cancelPaymentLink(linkId: string) {
    try {
      return await this.razorpay.paymentLink.cancel(linkId)
    } catch (error) {
      console.error('Failed to cancel payment link:', error)
      throw new Error(`Failed to cancel payment link: ${(error as Error).message}`)
    }
  }

  /**
   * Get payment link details
   */
  async getPaymentLink(linkId: string) {
    try {
      return await this.razorpay.paymentLink.fetch(linkId)
    } catch (error) {
      console.error('Failed to fetch payment link:', error)
      throw new Error(`Failed to fetch payment link: ${(error as Error).message}`)
    }
  }
}
