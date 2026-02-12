# PhonePe Payment Gateway - Quick Start Guide

## What's New

Your application now has full PhonePe payment gateway integration. Here's what was added:

### New Files Created

```
src/
├── services/phonepe.ts                    # Core PhonePe service
├── lib/
│   ├── phonepe-types.ts                   # TypeScript types
│   ├── phonepe-client.ts                  # Client utilities
├── app/api/phonepe/
│   ├── checkout/route.ts                  # Payment initiation API
│   ├── webhook/route.ts                   # Webhook handler
│   ├── status/route.ts                    # Status check API
└── components/phonepe/
    └── PaymentCallback.tsx                # Payment verification component

Documentation Files:
├── PHONEPE_INTEGRATION.md                 # Full integration guide
└── .env.local.example                     # Environment variables template
```

### Updated Files

- `src/components/booking/BookingForm.tsx` - Now uses PhonePe payment flow
- `src/lib/actions.ts` - Updated to call PhonePe API
- `src/app/booking/[eventId]/[bookingId]/success/page.tsx` - Added payment verification

## Setup (5 Steps)

### 1. Get PhonePe Credentials
- Sign up at [PhonePe Business](https://business.phonepe.com)
- Navigate to API Integration
- Copy your:
  - Merchant ID
  - API Key
  - Salt Key

### 2. Create `.env.local`
Copy `.env.local.example` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:
```env
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_API_KEY=your_api_key
PHONEPE_SALT_KEY=your_salt_key
PHONEPE_SANDBOX=true
PHONEPE_REDIRECT_URL=http://localhost:3000/booking/[eventId]/[bookingId]/success
PHONEPE_CALLBACK_URL=http://localhost:3000/api/phonepe/webhook
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Configure Webhook in PhonePe Dashboard
1. Go to Settings → Webhooks
2. Add URL: `https://yourdomain.com/api/phonepe/webhook`
3. Enable events:
   - `checkout.order.completed`
   - `checkout.order.failed`
   - `pg.refund.completed`
   - `pg.refund.failed`

### 4. Test in Sandbox
Use PhonePe's test credentials:
- Test UPI: `9999999999@upi` (succeeds)
- Test UPI: `9999999998@upi` (fails)

### 5. Deploy to Production
Update credentials and set `PHONEPE_SANDBOX=false`

## How It Works

### Payment Flow

```
1. User fills booking form → BookingForm.tsx
                    ↓
2. Initiate payment → API /api/phonepe/checkout
                    ↓
3. Get redirect URL → PhonePe PayPage
                    ↓
4. User pays → PhonePe Gateway (iframe)
                    ↓
5. Return to app → /booking/[eventId]/[bookingId]/success
                    ↓
6. Verify payment → PhonePePaymentCallback component
                    ↓
7. Webhook confirmation → /api/phonepe/webhook
                    ↓
8. Update booking → Firestore
                    ↓
9. Show ticket → TicketDisplay component
```

### Step 1: Generate Authorization Token
```typescript
// Automatically handled by PhonePeService
// Generates and caches token with 15-minute expiry
```

### Step 2: Create Payment Request
```typescript
// User submits booking form
const paymentResult = await initiatePhonePePayment({
  amount: totalAmount,
  customerName: userDetails.name,
  customerPhone: userDetails.phone,
  // ... other details
});
```

### Step 3: Invoke PayPage
```typescript
// Redirect to PhonePe payment gateway
loadPhonePePayPage(paymentResult.redirectUrl);
// User completes payment
```

### Step 4: Verify Payment Response
Two methods (automatic):
- **Webhook** (recommended) - PhonePe sends update to your server
- **Status API** - App polls for status if webhook delayed

## Key Features

✅ **Secure** - All requests signed with merchant credentials
✅ **Reliable** - Webhook + fallback status checking
✅ **User-Friendly** - Automatic iframe redirection
✅ **Production-Ready** - Error handling and logging
✅ **Sandbox Testing** - Easy test mode for development

## Testing Checklist

- [ ] Environment variables configured
- [ ] PhonePe credentials verified
- [ ] Test payment in sandbox
- [ ] Verify webhook reception
- [ ] Check booking created in Firestore
- [ ] Test payment failure flow
- [ ] Verify email notifications (if configured)

## API Endpoints

### POST /api/phonepe/checkout
Initiates payment. Called automatically by BookingForm.

### GET /api/phonepe/status
Check payment status. Called by PaymentCallback component.

### POST /api/phonepe/webhook
Receives payment updates from PhonePe. Auto-updates booking status.

## Common Issues & Solutions

### Payment shows as PENDING
- Webhook might be delayed
- App will poll status automatically
- PhonePe processes most payments within seconds

### Webhook not received
- Check URL is publicly accessible
- Verify webhook enabled in PhonePe dashboard
- Check firewall/security groups
- Test webhook from dashboard

### Validation errors
- Check phone number is 10 digits
- Verify amount is positive
- Ensure all required fields filled

## Component Usage

### BookingForm
```tsx
<BookingForm event={event} />
// Automatically handles:
// - Payment initiation
// - Redirect to PhonePe
// - Booking creation
```

### PhonePePaymentCallback
```tsx
<PhonePePaymentCallback
  onPaymentVerified={(status) => {
    // Handle payment completion
  }}
  onClose={() => {
    // Handle close
  }}
/>
```

## Client Functions

### initiatePhonePePayment()
```typescript
const result = await initiatePhonePePayment({
  orderId: 'ORD_123',
  amount: 999.99,
  customerName: 'John',
  customerPhone: '9876543210',
});

if (result.success) {
  loadPhonePePayPage(result.redirectUrl);
}
```

### verifyPaymentStatus()
```typescript
const status = await verifyPaymentStatus(merchantTransactionId);
// Returns: { success, state, message }
// state: "COMPLETED" | "FAILED" | "PENDING"
```

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| PHONEPE_MERCHANT_ID | Unique merchant ID | PGATEWAY123456 |
| PHONEPE_API_KEY | API authentication | abc123xyz |
| PHONEPE_SALT_KEY | Request signing | xyz789abc |
| PHONEPE_SANDBOX | Test/production | true or false |
| PHONEPE_REDIRECT_URL | User return URL | http://localhost:3000/... |
| PHONEPE_CALLBACK_URL | Webhook URL | http://localhost:3000/api/... |
| NEXT_PUBLIC_APP_URL | Client-side app URL | http://localhost:3000 |

## Next Steps

1. ✅ Review environment setup
2. ✅ Test payment flow in sandbox
3. ✅ Configure webhook
4. ✅ Add email notifications (optional)
5. ✅ Set up monitoring/logging
6. ✅ Deploy to production

## Support

- **PhonePe Docs:** https://developer.phonepe.com
- **Integration Guide:** See `PHONEPE_INTEGRATION.md`
- **Example Requests:** See service files in `src/services/`

## Important Security Notes

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Keep credentials secret** - Use secure secret management
3. **Always validate on server** - Don't trust client-side amounts
4. **Verify webhook signatures** - Always check X-Verify header
5. **Log all transactions** - For audit and debugging
6. **Handle errors gracefully** - Notify users and support

---

For detailed information, see `PHONEPE_INTEGRATION.md`
