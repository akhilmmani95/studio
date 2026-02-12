# PhonePe Payment Gateway Integration Guide

## Overview

This document provides step-by-step instructions for integrating PhonePe's Standard Checkout payment gateway into your Next.js application. The implementation follows the 4-step process outlined in PhonePe's documentation.

## Integration Architecture

### 4-Step Payment Flow

1. **Generate Authorization Token** - Authenticate with PhonePe API
2. **Create Payment Request** - Initiate a transaction with customer details
3. **Invoke PayPage** - Redirect customer to PhonePe's payment interface
4. **Verify Payment Response** - Confirm payment status via webhook or status check API

### Components

- `src/services/phonepe.ts` - Core PhonePe service with all API integrations
- `src/app/api/phonepe/checkout/route.ts` - API endpoint to initiate payments
- `src/app/api/phonepe/webhook/route.ts` - Webhook handler for payment status updates
- `src/app/api/phonepe/status/route.ts` - Status check API (fallback verification)
- `src/lib/phonepe-client.ts` - Client-side payment utilities
- `src/components/phonepe/PaymentCallback.tsx` - Callback handler component
- `src/lib/phonepe-types.ts` - TypeScript interfaces

## Setup Instructions

### 1. Get PhonePe Credentials

1. Visit [PhonePe Business Portal](https://business.phonepe.com)
2. Sign up or log in to your account
3. Navigate to **API Integration** or **Settings**
4. Copy your:
   - **Merchant ID** - Unique identifier for your business
   - **API Key** - Used for authentication
   - **Salt Key** - Used for request signing and verification

### 2. Configure Environment Variables

Add these variables to your `.env.local` file:

```env
# PhonePe Configuration
PHONEPE_MERCHANT_ID=PGATEWAY123456789
PHONEPE_API_KEY=YOUR_API_KEY_HERE
PHONEPE_SALT_KEY=YOUR_SALT_KEY_HERE
PHONEPE_SANDBOX=true
PHONEPE_REDIRECT_URL=http://localhost:3000/booking/[eventId]/[bookingId]/success
PHONEPE_CALLBACK_URL=http://your-domain.com/api/phonepe/webhook

# For production
# PHONEPE_REDIRECT_URL=https://yourdomain.com/booking/[eventId]/[bookingId]/success
# PHONEPE_CALLBACK_URL=https://yourdomain.com/api/phonepe/webhook
```

**Important:**
- Keep `PHONEPE_SANDBOX=true` and use sandbox credentials for testing
- Change to `false` and use production credentials for live payments
- The URLs must be publicly accessible for webhooks to work

### 3. Configure Webhook Endpoint

In PhonePe Business Portal:

1. Go to **Settings → API Configuration → Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/phonepe/webhook`
3. Select events:
   - `checkout.order.completed`
   - `checkout.order.failed`
   - `pg.refund.completed`
   - `pg.refund.failed`
4. Save configuration
5. Test webhook (PhonePe provides a test button)

## API Endpoints

### POST /api/phonepe/checkout
Initiates a payment transaction.

**Request:**
```json
{
  "orderId": "ORD_1234567890",
  "amount": 999.99,
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "customerEmail": "john@example.com",
  "bookingId": "booking_123",
  "eventId": "event_456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment initiated",
  "redirectUrl": "https://pg-sandbox.phonepe.com/...",
  "merchantTransactionId": "PGATEWAY123456789_ORD_1234567890_1708873456789"
}
```

### GET /api/phonepe/status?merchantTransactionId=...
Checks payment status (fallback to webhook).

**Response:**
```json
{
  "success": true,
  "state": "COMPLETED",
  "transactionId": "T2308081234123459",
  "message": "Payment COMPLETED"
}
```

### POST /api/phonepe/webhook
Receives payment status updates from PhonePe. Automatically processes payment confirmation and updates booking status.

## Payment Flow in Application

### 1. Booking Form
The `BookingForm` component handles the initial payment flow:

```tsx
// User submits form with name, phone, ticket selection
const paymentResult = await initiatePhonePePayment({
  orderId: 'ORD_1234567890',
  amount: 999.99,
  customerName: 'John Doe',
  customerPhone: '9876543210',
  bookingId: 'booking_id',
  eventId: 'event_id',
});

// Booking created with PENDING status
await setDoc(newBookingRef, newBooking);

// Redirect to PhonePe payment page
loadPhonePePayPage(paymentResult.redirectUrl);
```

### 2. Payment Gateway
User completes payment with PhonePe.

### 3. Callback Handling
After payment, user is redirected back to your app with the merchant transaction ID:
```
/booking/[eventId]/[bookingId]/success?merchantTransactionId=...
```

The `PhonePePaymentCallback` component verifies the payment status.

### 4. Webhook Verification
PhonePe sends webhook notification to `/api/phonepe/webhook` with payment status. The webhook:
- Validates the signature
- Updates booking status in Firestore
- Records transaction details

## Testing

### Sandbox Testing

PhonePe provides test credentials and payment methods:

**Test UPI IDs:**
```
9999999999@upi (success)
9999999998@upi (failure)
9999999997@upi (pending)
```

**Test Cards:**
- Visa: `4111 1111 1111 1111`
- MasterCard: `5555 5555 5555 4444`

### Testing Steps

1. Set `PHONEPE_SANDBOX=true`
2. Use test credentials from PhonePe
3. Fill booking form
4. Select payment method and enter test credentials
5. Verify payment status updates in Firestore
6. Check webhook logs in PhonePe dashboard

## Security Considerations

### Request Signing
All API requests are signed using:
```
Signature = SHA256(payload + saltKey + requestType) + ### + keyIndex
```

### Webhook Verification
Webhooks are verified using the same signing mechanism. Always validate:
1. `X-Verify` header signature
2. Payload authenticity
3. Timestamp freshness

### Best Practices

1. **Never expose secrets** - Keep API keys and salt keys only in environment variables
2. **Validate amounts** - Always verify transaction amount on server
3. **Handle race conditions** - Webhook and API polling might both complete
4. **Timeout handling** - Implement server-side timeout for pending payments
5. **Logging** - Log all transactions for audit purposes
6. **Error handling** - Gracefully handle network failures and API timeouts

## Troubleshooting

### Payment Initiation Fails
- Check if environment variables are set correctly
- Verify merchant ID and credentials with PhonePe
- Check network connectivity to PhonePe API

### Webhook Not Received
- Verify webhook URL is publicly accessible (not localhost)
- Check firewall/security group rules
- Verify webhook configuration in PhonePe dashboard
- Test webhook from PhonePe dashboard using test button

### Payment Status Shows as PENDING
- This is normal - wait for webhook or check status manually
- Status API can be called to verify current state
- Implement polling for 30-60 seconds as fallback

### Signature Verification Fails
- Ensure salt key matches exactly with PhonePe dashboard
- Verify payload is not modified during transmission
- Check key index matches PhonePe configuration

## Response Status Codes

| State | Meaning | Action |
|-------|---------|--------|
| COMPLETED | Payment successful | Confirm booking, download ticket |
| FAILED | Payment declined/failed | Show error, allow retry |
| PENDING | Awaiting verification | Wait for webhook, show message |

## Payment State Handling

```typescript
switch (paymentState) {
  case "COMPLETED":
    // Mark booking as confirmed
    // Send confirmation email
    // Enable ticket download
    break;
  
  case "FAILED":
    // Mark booking as cancelled
    // Release reserved seats
    // Offer to retry
    break;
  
  case "PENDING":
    // Keep booking in pending state
    // Send confirmation email when webhook arrives
    // Implement timeout (auto-cancel after 24 hours)
    break;
}
```

## Refund Implementation

PhonePe service includes refund support:

```typescript
await phonePeService.refundPayment({
  originalMerchantTransactionId: transactionId,
  refundAmount: 999.99,
  refundReason: "Customer requested refund",
});
```

## Monitoring and Logging

Monitor these key areas:

1. **Payment Initiation Success Rate** - Track failed API calls
2. **Payment Completion Rate** - Percentage of initiated payments that complete
3. **Webhook Delivery** - Successful webhook receipts
4. **Response Times** - API call latency
5. **Error Rates** - Failed transactions and reasons

## Production Deployment

### Before Going Live

1. ✅ Obtain production credentials from PhonePe
2. ✅ Update environment variables with production values
3. ✅ Configure production webhook URL
4. ✅ Test with real payments (use small amounts)
5. ✅ Set up monitoring and alerting
6. ✅ Document refund procedures
7. ✅ Train support team on payment issues
8. ✅ Set up error logging and recovery procedures

### Production Checklist

```env
PHONEPE_SANDBOX=false
PHONEPE_MERCHANT_ID=LIVE_MERCHANT_ID
PHONEPE_API_KEY=LIVE_API_KEY
PHONEPE_SALT_KEY=LIVE_SALT_KEY
PHONEPE_REDIRECT_URL=https://yourdomain.com/booking/[eventId]/[bookingId]/success
PHONEPE_CALLBACK_URL=https://yourdomain.com/api/phonepe/webhook
```

## Support and Resources

- **PhonePe Developers:** [https://developer.phonepe.com](https://developer.phonepe.com)
- **API Documentation:** [PhonePe API Reference](https://developer.phonepe.com/docs)
- **Sandbox Credentials:** Available in PhonePe Business Portal
- **Support Email:** support@phonepe.com

## Additional Implementation Notes

### Firebase Integration
The webhook handler needs Firebase Admin SDK to update bookings. Current implementation logs updates; set up Firebase Admin SDK for production:

```typescript
import * as admin from 'firebase-admin';

const db = admin.firestore();
// Then use db.collection().update() in webhook handler
```

### Email Notifications
Consider sending confirmation emails after successful payment:
- Payment confirmation to customer
- New booking notification to admin
- Ticket details via email

### Rate Limiting
Implement rate limiting on `/api/phonepe/checkout` to prevent abuse.

## File Structure

```
src/
├── services/
│   └── phonepe.ts          # Core PhonePe service
├── lib/
│   ├── phonepe-types.ts    # Type definitions
│   ├── phonepe-client.ts   # Client utilities
│   └── actions.ts          # Server actions
├── app/api/phonepe/
│   ├── checkout/route.ts   # Payment initiation
│   ├── webhook/route.ts    # Webhook handler
│   └── status/route.ts     # Status check
└── components/
    └── phonepe/
        └── PaymentCallback.tsx  # Callback handler
```

---

For any questions or issues, refer to PhonePe's official documentation or contact their support team.
