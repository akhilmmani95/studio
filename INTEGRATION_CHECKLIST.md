# PhonePe Integration Checklist

## 📋 Pre-Integration Setup

### Get PhonePe Credentials
- [ ] Sign up at [PhonePe Business](https://business.phonepe.com)
- [ ] Verify email and complete KYC
- [ ] Navigate to API Integration settings
- [ ] Copy Merchant ID
- [ ] Copy API Key
- [ ] Copy Salt Key (key index varies, usually 1 or 2)
- [ ] Note: You'll have different credentials for Sandbox and Production

### Environment Setup
- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Add PHONEPE_MERCHANT_ID (use sandbox ID first)
- [ ] Add PHONEPE_API_KEY
- [ ] Add PHONEPE_SALT_KEY
- [ ] Set PHONEPE_SANDBOX=true
- [ ] Set PHONEPE_REDIRECT_URL (adjust for your domain)
- [ ] Set PHONEPE_CALLBACK_URL (public URL, not localhost for webhook)
- [ ] Set NEXT_PUBLIC_APP_URL

### Webhook Configuration
- [ ] Log into PhonePe Business Portal
- [ ] Navigate to Settings → API Configuration → Webhooks
- [ ] Click "Add Webhook"
- [ ] Enter URL: https://yourdomain.com/api/phonepe/webhook
- [ ] Select events:
  - [ ] checkout.order.completed
  - [ ] checkout.order.failed
  - [ ] pg.refund.completed
  - [ ] pg.refund.failed
- [ ] Enable webhook
- [ ] Save configuration
- [ ] Test webhook delivery (use PhonePe's test button)

## 🧪 Testing Phase

### Sandbox Testing
- [ ] Ensure PHONEPE_SANDBOX=true
- [ ] Ensure using sandbox credentials
- [ ] Restart development server
- [ ] Open booking page
- [ ] Fill booking form with test data:
  - Name: "Test User"
  - Phone: "9999999999"
  - Event: Select any event
  - Tickets: Select quantity
- [ ] Click "Pay & Book Now"
- [ ] Should redirect to PhonePe sandbox

### Payment Test - Success Case
- [ ] Get test UPI from PhonePe: 9999999999@upi
- [ ] Enter UPI ID in PhonePe payment form
- [ ] Complete payment (should succeed)
- [ ] Return to app
- [ ] Payment callback should show "COMPLETED"
- [ ] Booking should appear in success page
- [ ] QR code should generate
- [ ] Ticket should be downloadable

### Payment Test - Failure Case
- [ ] Get test UPI that fails: 9999999998@upi
- [ ] Enter UPI in payment form
- [ ] Complete payment (should fail)
- [ ] Return to app
- [ ] Payment callback should show "FAILED"
- [ ] Error message should display
- [ ] Should offer to retry

### Payment Test - Pending Case
- [ ] Get test UPI that's pending: 9999999997@upi
- [ ] Enter UPI in payment form
- [ ] Return to app (may show PENDING)
- [ ] App should poll for status
- [ ] Eventually should confirm via webhook

### Webhook Testing
- [ ] Check PhonePe dashboard for webhook logs
- [ ] Verify webhook was delivered
- [ ] Confirm signature validation passed
- [ ] Open Firestore console
- [ ] Check booking document was updated
- [ ] Verify payment status recorded

### Payment Verification
- [ ] Check Firestore for created booking
- [ ] Verify paymentId field is populated
- [ ] Verify booking status (should be confirmed)
- [ ] Verify payment timestamp recorded

## 🔍 Code Verification

### API Routes
- [ ] POST /api/phonepe/checkout responds with redirectUrl
- [ ] GET /api/phonepe/status returns payment state
- [ ] POST /api/phonepe/webhook accepts and processes webhook
- [ ] Webhook signature verification works

### Components
- [ ] BookingForm integrates PhonePe payment
- [ ] PhonePePaymentCallback displays payment status
- [ ] Success page shows ticket after payment
- [ ] Error handling shows meaningful messages

### Database
- [ ] Firestore bookings have paymentId field
- [ ] Payment status recorded in booking doc
- [ ] Transaction timestamps recorded

## 📊 Email Notifications (Optional)

- [ ] Set up email service (SendGrid, AWS SES, etc.)
- [ ] Send confirmation email after payment success
- [ ] Include ticket details in email
- [ ] Send failure notification on payment failure
- [ ] Send refund confirmation if applicable

## 🔐 Security Checks

- [ ] `.env.local` not committed to git
- [ ] Credentials not exposed in logs
- [ ] Webhook signature validation enabled
- [ ] Amount validation on server-side
- [ ] Rate limiting on checkout endpoint
- [ ] Error messages don't expose sensitive info
- [ ] HTTPS enforced in production
- [ ] Webhook URL uses HTTPS

## 🆘 Troubleshooting

### "Payment initiation fails"
- [ ] Verify environment variables
- [ ] Check merchant ID is correct
- [ ] Ensure API key is valid
- [ ] Check internet connectivity
- [ ] Review server logs for errors
- [ ] Try sandbox mode

### "Webhook not received"
- [ ] Confirm URL is publicly accessible
- [ ] Check PhonePe webhook logs
- [ ] Verify webhook enabled in dashboard
- [ ] Confirm events are selected
- [ ] Check firewall/security groups
- [ ] Test webhook delivery from dashboard

### "Payment shows PENDING"
- [ ] Wait for webhook (usually 1-2 seconds)
- [ ] Check app is polling status
- [ ] Verify Firestore is updating
- [ ] Check PhonePe transaction logs
- [ ] Confirm payment in PhonePe dashboard

### "Type errors in IDE"
- [ ] Run `npm install`
- [ ] Restart VS Code
- [ ] Check @types/node is installed
- [ ] TypeScript errors don't affect runtime

## 🚀 Production Preparation

### Before Going Live
- [ ] Successful sandbox testing completed
- [ ] Get production PhonePe credentials
- [ ] Create separate `.env.production.local`
- [ ] Update production credentials
- [ ] Set PHONEPE_SANDBOX=false
- [ ] Configure production webhook URL
- [ ] Deploy to staging server
- [ ] Test with small payment amount
- [ ] Monitor logs for errors
- [ ] Set up error alerting
- [ ] Document refund procedure
- [ ] Train support team
- [ ] Create incident response plan

### Production Environment
- [ ] PHONEPE_MERCHANT_ID = production ID
- [ ] PHONEPE_API_KEY = production key
- [ ] PHONEPE_SALT_KEY = production salt
- [ ] PHONEPE_SANDBOX = false
- [ ] PHONEPE_REDIRECT_URL = https://yourdomain.com/...
- [ ] PHONEPE_CALLBACK_URL = https://yourdomain.com/api/phonepe/webhook
- [ ] NEXT_PUBLIC_APP_URL = https://yourdomain.com
- [ ] All URLs use HTTPS
- [ ] Webhook configured for production
- [ ] Logging and monitoring enabled
- [ ] Error tracking configured
- [ ] Backup and recovery plan in place

### Monitoring
- [ ] Payment success rate tracking
- [ ] Failed transaction monitoring
- [ ] Webhook delivery monitoring
- [ ] API response time tracking
- [ ] Error rate monitoring
- [ ] Daily transaction reconciliation
- [ ] Monthly revenue reports
- [ ] Customer issue tracking

## ✅ Final Validation

- [ ] All tests passed
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Booking flow works end-to-end
- [ ] Payment confirmation works
- [ ] Ticket generation works
- [ ] Email notifications sent (if implemented)
- [ ] Firestore data consistent
- [ ] Webhook verified
- [ ] Ready for production

## 📚 Documentation Review

- [ ] Read INTEGRATION_SUMMARY.md
- [ ] Read PHONEPE_QUICK_START.md
- [ ] Read PHONEPE_INTEGRATION.md
- [ ] Understand payment flow
- [ ] Know how to troubleshoot
- [ ] Have support contacts ready

## 🎉 Deployment Ready

Once all boxes are checked:
- [ ] Deploy to production
- [ ] Monitor first transactions
- [ ] Be available for support
- [ ] Track success metrics
- [ ] Collect user feedback
- [ ] Plan for improvements

---

**Status:** Ready to begin integration

Start with "Pre-Integration Setup" section and work through the checklist systematically.
