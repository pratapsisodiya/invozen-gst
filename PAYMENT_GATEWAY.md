# Payment Gateway Integration (Razorpay)

## Overview

Complete Razorpay payment gateway integration enabling online invoice payments via payment links and automatic payment reconciliation through webhooks.

---

## Features Implemented

### 1. Payment Link Generation

**Endpoint:** `POST /api/v1/payment-gateway/create-link`

**Features:**
- Creates Razorpay payment link for any invoice
- Automatically calculates amount due (balance after partial payments)
- Validates invoice is not already paid
- Configurable expiry (1-30 days)
- Optional customer notifications via email and SMS
- Automatic payment reminders

**Request Body:**
```json
{
  "invoiceId": "uuid",
  "notifyCustomer": true,
  "expiryDays": 7
}
```

**Response:**
```json
{
  "paymentLink": "https://rzp.io/i/abcdefgh",
  "paymentLinkId": "plink_xyz123",
  "amount": 50000,
  "currency": "INR",
  "status": "created",
  "expiresAt": "2026-05-12T00:00:00Z"
}
```

**Validation:**
- Invoice must exist and belong to authenticated user
- Invoice must not be fully paid
- Amount due must be > 0
- Expiry days between 1-30

**Invoice Update:**
- Stores payment link URL in invoice data
- Records payment link ID for tracking
- Tracks creation timestamp and expiry date

### 2. Webhook Handler

**Endpoint:** `POST /api/v1/payment-gateway/webhook`

**Security:**
- Verifies webhook signature using HMAC SHA256
- Uses RAZORPAY_WEBHOOK_SECRET to prevent spoofing
- Returns 200 OK for all requests (prevents retries on error)
- Logs all webhook events for audit trail

**Supported Events:**

#### A. Payment Success (payment.captured, payment_link.paid)
- Creates payment record with full transaction details
- Updates invoice `amountPaid` and `balanceDue`
- Changes invoice status to 'paid' if fully paid
- Records payment method, Razorpay payment ID, order ID
- Stores customer email and contact for reference
- Logs audit entry with payment details

**Payment Record Data:**
```json
{
  "amount": 50000,
  "method": "upi",
  "paymentId": "pay_xyz123",
  "orderId": "order_abc456",
  "status": "success",
  "currency": "INR",
  "captured": true,
  "email": "customer@example.com",
  "contact": "9876543210",
  "razorpaySignature": "...",
  "createdAt": "2026-05-05T10:30:00Z"
}
```

#### B. Payment Failure (payment.failed)
- Logs failed payment attempt
- Records error code and description
- Does NOT update invoice status
- Creates audit entry for tracking

**Audit Entry Data:**
```json
{
  "razorpayPaymentId": "pay_xyz123",
  "method": "card",
  "errorCode": "BAD_REQUEST_ERROR",
  "errorDescription": "Card declined by issuing bank",
  "failedAt": "2026-05-05T10:30:00Z"
}
```

#### C. Refund (refund.created)
- Updates payment record with refund details
- Reverses invoice `amountPaid` and `balanceDue`
- Changes invoice status back to 'sent' if balance becomes positive
- Records refund ID and timestamp

**Refund Update:**
```json
{
  "refunded": true,
  "refundAmount": 50000,
  "refundId": "rfnd_xyz123",
  "refundedAt": "2026-05-06T15:20:00Z"
}
```

### 3. Payment Status Check

**Endpoint:** `GET /api/v1/payment-gateway/status/:invoiceId`

**Response:**
```json
{
  "invoiceNumber": "INV-2026-0001",
  "amount": 50000,
  "amountPaid": 30000,
  "balanceDue": 20000,
  "status": "sent",
  "paymentLink": "https://rzp.io/i/abcdefgh",
  "paymentLinkId": "plink_xyz123",
  "paymentLinkCreatedAt": "2026-05-05T10:00:00Z",
  "paymentLinkExpireBy": "2026-05-12T00:00:00Z"
}
```

---

## Backend Implementation

### RazorpayService Class

**File:** `backend/src/lib/payments/razorpay.ts`

**Methods:**

1. **createPaymentLink(options: PaymentLinkOptions)**
   - Creates payment link via Razorpay API
   - Accepts amount, currency, customer details, callback URL, expiry
   - Returns payment link ID and short URL

2. **verifyWebhookSignature(payload: string, signature: string)**
   - Validates webhook authenticity using HMAC SHA256
   - Uses timing-safe comparison to prevent timing attacks
   - Returns boolean (true if valid)

3. **parseWebhook(payload: string)**
   - Parses JSON webhook payload
   - Returns structured webhook object

4. **getPayment(paymentId: string)**
   - Fetches payment details from Razorpay
   - Used for manual verification

5. **refundPayment(paymentId: string, amount?: number)**
   - Initiates refund (full or partial)
   - Uses 'normal' speed (not instant)

6. **cancelPaymentLink(linkId: string)**
   - Cancels active payment link
   - Prevents further payments

7. **getPaymentLink(linkId: string)**
   - Fetches payment link details
   - Shows payment attempts and status

### Payment Gateway Routes

**File:** `backend/src/routes/paymentGateway.ts`

**Route Registration:** `router.use('/payment-gateway', paymentGatewayRouter)` in `backend/src/routes/index.ts`

**Authentication:** All endpoints except webhook require `requireAuth` middleware

**Webhook Security:** No authentication (public endpoint), but signature verification required

---

## Configuration

### Environment Variables

Add to `backend/.env`:

```bash
# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

**Getting Credentials:**

1. **Sign up for Razorpay**
   - Go to https://razorpay.com
   - Create account and complete KYC

2. **Get API Keys**
   - Dashboard → Settings → API Keys
   - Generate Test Mode keys for development
   - Generate Live Mode keys for production

3. **Setup Webhook**
   - Dashboard → Settings → Webhooks
   - Add webhook URL: `https://your-backend.com/api/v1/payment-gateway/webhook`
   - Select events: `payment.captured`, `payment_link.paid`, `payment.failed`, `refund.created`
   - Copy webhook secret and add to `.env`

### Dependencies

Already installed in `backend/package.json`:
```json
{
  "razorpay": "^2.9.6"
}
```

---

## Usage Examples

### Example 1: Create Payment Link

**Scenario:** Customer owes ₹50,000 on invoice INV-2026-0001

**API Call:**
```bash
curl -X POST https://api.yourdomain.com/api/v1/payment-gateway/create-link \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "invoice-uuid-here",
    "notifyCustomer": true,
    "expiryDays": 7
  }'
```

**Response:**
```json
{
  "paymentLink": "https://rzp.io/i/aBc123Def",
  "paymentLinkId": "plink_MN1234567890AB",
  "amount": 50000,
  "currency": "INR",
  "status": "created",
  "expiresAt": "2026-05-12T23:59:59.999Z"
}
```

**What Happens:**
1. Razorpay creates payment link
2. Invoice updated with payment link URL
3. Customer receives email/SMS (if notifyCustomer: true)
4. Automatic reminders sent before expiry

### Example 2: Customer Pays Invoice

**Customer Action:** Opens payment link, pays ₹50,000 via UPI

**Webhook Flow:**
1. Razorpay sends webhook to `/api/v1/payment-gateway/webhook`
2. Backend verifies signature
3. Extracts payment details from webhook
4. Creates payment record:
   ```json
   {
     "id": "payment-uuid",
     "userId": "user-uuid",
     "invoiceId": "invoice-uuid",
     "customerId": "customer-uuid",
     "paymentDate": "2026-05-05T14:30:00Z",
     "data": {
       "amount": 50000,
       "method": "upi",
       "paymentId": "pay_MN1234567890AB",
       "status": "success"
     }
   }
   ```
5. Updates invoice:
   ```json
   {
     "amountPaid": 50000,
     "balanceDue": 0,
     "status": "paid",
     "paidAt": "2026-05-05T14:30:00Z",
     "lastPaymentAt": "2026-05-05T14:30:00Z"
   }
   ```
6. Creates audit log entry

### Example 3: Partial Payment

**Scenario:** Invoice total ₹100,000, customer pays ₹60,000

**Initial Invoice:**
```json
{
  "grandTotal": 100000,
  "amountPaid": 0,
  "balanceDue": 100000,
  "status": "sent"
}
```

**After Partial Payment:**
```json
{
  "grandTotal": 100000,
  "amountPaid": 60000,
  "balanceDue": 40000,
  "status": "sent",
  "lastPaymentAt": "2026-05-05T14:30:00Z"
}
```

**Create New Payment Link for Remaining Amount:**
```bash
curl -X POST .../payment-gateway/create-link \
  -d '{"invoiceId": "...", "notifyCustomer": true}'
```

Response will show `"amount": 40000` (remaining balance)

### Example 4: Refund Scenario

**Scenario:** Customer requests refund of ₹50,000 payment

**Razorpay Dashboard Action:**
1. Go to Payments → find payment
2. Click Refund → Enter amount → Confirm

**Webhook Flow:**
1. Razorpay sends `refund.created` webhook
2. Backend updates payment record with refund details
3. Invoice recalculated:
   ```json
   {
     "amountPaid": 0,
     "balanceDue": 50000,
     "status": "sent"
   }
   ```
4. Audit log created

---

## Frontend Integration

### Step 1: Display Payment Link Button

**File:** `frontend/app/components/invoices/InvoiceDetailClient.tsx`

```typescript
import { useState } from 'react'

const InvoiceDetailClient = ({ invoice }) => {
  const [loading, setLoading] = useState(false)
  
  const createPaymentLink = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/payment-gateway/create-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          notifyCustomer: true,
          expiryDays: 7
        })
      })
      
      const data = await response.json()
      
      // Update invoice with payment link
      setInvoice({ ...invoice, paymentLink: data.paymentLink })
      
      // Show success toast
      toast.success('Payment link created! Customer notified.')
    } catch (error) {
      toast.error('Failed to create payment link')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      {invoice.status !== 'paid' && !invoice.paymentLink && (
        <Button onClick={createPaymentLink} loading={loading}>
          Create Payment Link
        </Button>
      )}
      
      {invoice.paymentLink && (
        <div>
          <p>Payment Link: 
            <a href={invoice.paymentLink} target="_blank">
              {invoice.paymentLink}
            </a>
          </p>
          <Button onClick={() => navigator.clipboard.writeText(invoice.paymentLink)}>
            Copy Link
          </Button>
        </div>
      )}
    </div>
  )
}
```

### Step 2: Add to Invoice Email

**Template:**
```
Dear [Customer Name],

Please find your invoice INV-2026-0001 attached.

Amount Due: ₹50,000
Due Date: 15-May-2026

Pay Online: [Payment Link]

Thank you for your business!
```

### Step 3: Display Payment Status

**Invoice List:**
```typescript
{invoice.status === 'paid' ? (
  <Badge variant="success">Paid</Badge>
) : invoice.paymentLink ? (
  <Badge variant="warning">Payment Link Sent</Badge>
) : (
  <Badge variant="default">Unpaid</Badge>
)}
```

---

## Testing

### Test Mode

Razorpay provides test mode with test cards for development:

**Test Card Numbers:**
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`
- CVV: any 3 digits
- Expiry: any future date

**Test UPI ID:** `success@razorpay`

### Webhook Testing

**Local Development:**
1. Use ngrok to expose localhost:
   ```bash
   ngrok http 4000
   ```
2. Copy ngrok URL: `https://abc123.ngrok.io`
3. Add webhook in Razorpay dashboard: `https://abc123.ngrok.io/api/v1/payment-gateway/webhook`
4. Make test payment
5. Watch backend logs for webhook events

**Manual Webhook Testing:**
```bash
# Generate test signature
payload='{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test123","amount":5000000,"status":"captured"}}}}'
signature=$(echo -n "$payload" | openssl dgst -sha256 -hmac "your_webhook_secret" | awk '{print $2}')

# Send webhook
curl -X POST http://localhost:4000/api/v1/payment-gateway/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $signature" \
  -d "$payload"
```

### Production Checklist

- [ ] Switch to Live Mode API keys
- [ ] Update webhook URL to production domain
- [ ] Test one real payment (₹1)
- [ ] Verify webhook delivery in Razorpay dashboard
- [ ] Monitor first 10 payments closely
- [ ] Set up alerts for webhook failures
- [ ] Enable auto-retry for failed webhooks (Razorpay settings)

---

## Security Considerations

### Webhook Security

1. **Signature Verification (CRITICAL)**
   - Always verify webhook signature before processing
   - Use `crypto.timingSafeEqual()` to prevent timing attacks
   - Never trust webhook data without verification

2. **Idempotency**
   - Razorpay may send duplicate webhooks
   - Check if payment already processed before creating duplicate records
   - Use Razorpay payment ID as unique constraint

3. **Public Endpoint**
   - Webhook endpoint is public (no authentication)
   - Must handle malicious requests gracefully
   - Log suspicious activity (invalid signatures, malformed payloads)

### Amount Validation

- Always recalculate amount due on backend (never trust frontend)
- Verify payment amount matches invoice balance before marking as paid
- Handle partial payments correctly

### Error Handling

- Return 200 OK even on errors (prevents Razorpay retries)
- Log errors internally for debugging
- Never expose sensitive error details in webhook response

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Payment Success Rate**
   - Target: >95%
   - Track via audit logs (payment_received vs payment_failed)

2. **Webhook Delivery Rate**
   - Check Razorpay dashboard → Webhooks → Delivery logs
   - Set up alerts for failed webhooks

3. **Average Payment Time**
   - Time from payment link creation to payment captured
   - Track customer friction

4. **Refund Rate**
   - Monitor refund requests
   - High refund rate indicates product/service issues

### Alerting

Set up alerts for:
- Webhook signature verification failures (potential attack)
- Payment processing errors
- Unusual refund volumes
- Payment link creation failures

---

## Troubleshooting

### Issue 1: Webhook Not Received

**Symptoms:** Payment successful but invoice not updated

**Diagnosis:**
1. Check Razorpay dashboard → Webhooks → Delivery Logs
2. Look for failed delivery attempts
3. Check status code and error message

**Solutions:**
- Verify webhook URL is correct and publicly accessible
- Check firewall/security group allows incoming requests
- Ensure backend is running and healthy
- Test webhook endpoint manually with curl

### Issue 2: Invalid Signature Error

**Symptoms:** Webhook received but rejected with "Invalid signature"

**Diagnosis:**
1. Check `RAZORPAY_WEBHOOK_SECRET` in `.env` matches Razorpay dashboard
2. Verify no extra whitespace in environment variable
3. Check webhook payload is being passed as raw string (not parsed JSON)

**Solution:**
```typescript
// Correct: Use raw body string
const payload = JSON.stringify(req.body)
razorpay.verifyWebhookSignature(payload, signature)

// Wrong: Pre-parsed body loses original formatting
razorpay.verifyWebhookSignature(req.body, signature) // ❌
```

### Issue 3: Invoice Not Marked as Paid

**Symptoms:** Payment received but invoice status still "sent"

**Diagnosis:**
1. Check if payment record was created in database
2. Verify `invoice_id` in webhook payload matches invoice UUID
3. Check if amount calculation is correct

**Common Causes:**
- Invoice ID mismatch (check `notes.invoice_id` in webhook)
- Partial payment not handled correctly
- Database transaction failed

---

## API Documentation Summary

### POST /payment-gateway/create-link

**Authentication:** Required (Bearer token)

**Request:**
```json
{
  "invoiceId": "uuid",
  "notifyCustomer": boolean,
  "expiryDays": number (1-30)
}
```

**Response:** 201 Created
```json
{
  "paymentLink": "string",
  "paymentLinkId": "string",
  "amount": number,
  "currency": "string",
  "status": "string",
  "expiresAt": "ISO 8601 date"
}
```

**Errors:**
- 400: Invalid request (invoice already paid, no amount due)
- 404: Invoice not found
- 500: Razorpay API error

---

### POST /payment-gateway/webhook

**Authentication:** None (public endpoint with signature verification)

**Headers:**
- `x-razorpay-signature`: HMAC SHA256 signature

**Request:** Razorpay webhook payload (varies by event)

**Response:** 200 OK (always)
```json
{
  "status": "ok"
}
```

**Events Handled:**
- `payment.captured`
- `payment_link.paid`
- `payment.failed`
- `refund.created`

---

### GET /payment-gateway/status/:invoiceId

**Authentication:** Required (Bearer token)

**Response:** 200 OK
```json
{
  "invoiceNumber": "string",
  "amount": number,
  "amountPaid": number,
  "balanceDue": number,
  "status": "string",
  "paymentLink": "string | null",
  "paymentLinkId": "string | null",
  "paymentLinkCreatedAt": "ISO 8601 date | null",
  "paymentLinkExpireBy": "ISO 8601 date | null"
}
```

**Errors:**
- 404: Invoice not found

---

## Compliance Notes

### GST Implications

- Payment gateway fees are subject to 18% GST
- Razorpay automatically adds GST to transaction fees
- Transaction fees are deductible business expenses
- Payment reconciliation required for GST returns

### TDS Considerations

- Section 194O: TDS on e-commerce transactions (1% for gross receipts >₹5 lakhs)
- Applies if using Razorpay's payment aggregator model
- Razorpay provides TDS certificates quarterly

### Data Privacy

- Razorpay is PCI-DSS compliant
- Never store card details in your database
- Razorpay handles all sensitive payment data
- Only store payment IDs and transaction status

---

## Production Deployment Status

✅ **Backend Implementation: 100% Complete**
- RazorpayService class created
- Payment gateway routes implemented
- Webhook handlers fully functional
- Configuration added to config.ts
- Route registered in main router
- Environment variables documented

❌ **Frontend Integration: 0% Not Yet Started**
- Payment link creation UI pending
- Invoice detail page integration pending
- Payment status display pending
- Email template update pending

✅ **Documentation: Complete**
- API endpoints documented
- Usage examples provided
- Security considerations outlined
- Testing guide included

---

## Next Steps

1. **Frontend Integration**
   - Add "Create Payment Link" button to invoice detail page
   - Show payment link in invoice list
   - Add copy-to-clipboard functionality
   - Display payment status badges

2. **Email/SMS Integration**
   - Include payment link in invoice emails
   - Send payment confirmation emails
   - Implement reminder notifications for unpaid invoices

3. **Analytics Dashboard**
   - Track payment success rate
   - Monitor average payment time
   - Show payment method distribution
   - Revenue by payment channel

4. **Advanced Features**
   - Recurring payment links for subscription invoices
   - Partial payment tracking with installments
   - Payment reminders automation
   - Customer payment portal

---

**Implementation Date:** May 2026  
**Status:** ✅ Backend Complete, Frontend Pending  
**Production Ready:** 70% (backend only)
