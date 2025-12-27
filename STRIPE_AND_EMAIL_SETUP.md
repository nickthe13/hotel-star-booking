# Stripe Payment & Email Integration Setup Guide

This guide explains how to set up and test the Stripe payment integration and email notifications in the Hotel Star Booking application.

## Table of Contents

1. [Overview](#overview)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Testing Payments](#testing-payments)
5. [Testing Email Notifications](#testing-email-notifications)
6. [Stripe Webhook Testing](#stripe-webhook-testing)
7. [Production Deployment](#production-deployment)

---

## Overview

### What's Implemented

**Stripe Payment Integration:**
- ✅ Create payment intents for bookings
- ✅ Confirm payments with Stripe Elements
- ✅ Webhook handlers for async payment events
- ✅ Payment history tracking
- ✅ Saved payment methods
- ✅ Refund processing (admin)

**Email Notifications:**
- ✅ Welcome email on registration
- ✅ Booking confirmation email
- ✅ Payment receipt email
- ✅ Cancellation/refund confirmation email
- ✅ Beautiful HTML email templates

---

## Backend Setup

### 1. Environment Configuration

Update your `backend/.env` file with Stripe and email credentials:

```env
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Email Configuration (Gmail Example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM="Hotel Star Booking <noreply@hotelbooking.com>"
```

### 2. Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Add both to your `.env` file

### 3. Gmail App Password (for Email)

If using Gmail:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to **App Passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password to `EMAIL_PASSWORD` in `.env`

**Alternative Email Providers:**
- SendGrid: More reliable for production
- Mailgun: Good for transactional emails
- AWS SES: Scalable and cost-effective

### 4. Start the Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

The backend will start on `http://localhost:3000`

---

## Frontend Setup

### 1. Environment Configuration

Update `src/environments/environment.development.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  apiVersion: 'v1',
  stripePublishableKey: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY' // Same as backend
};
```

### 2. Start the Frontend

```bash
npm install
npm start
```

The frontend will start on `http://localhost:4200`

---

## Testing Payments

### Test Credit Cards

Stripe provides test card numbers for different scenarios:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |
| `4000 0000 0000 9995` | Declined - insufficient funds |
| `4000 0000 0000 0069` | Declined - expired card |

**Card Details for Testing:**
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

### Payment Flow Test

1. **Register/Login** to your account
2. **Browse hotels** and select a room
3. **Create a booking** with check-in/check-out dates
4. **Go to payment page**
5. **Enter test card** `4242 4242 4242 4242`
6. **Complete payment**
7. **Check your email** for:
   - Booking confirmation email
   - Payment receipt email
8. **View payment history** in your dashboard

### Expected Behavior

1. Payment intent created on backend
2. Stripe processes payment
3. Backend receives webhook (payment.succeeded)
4. Booking status updated to CONFIRMED
5. Two emails sent:
   - Booking confirmation with details
   - Payment receipt with transaction ID

---

## Testing Email Notifications

### Email Test Scenarios

#### 1. Registration Email
```
Action: Create new account
Expected: Welcome email with account details
Template: Welcome to Hotel Star Booking
```

#### 2. Booking Confirmation Email
```
Action: Complete a booking payment
Expected: Booking details (hotel, room, dates, amount)
Template: Booking Confirmed with check-in instructions
```

#### 3. Payment Receipt Email
```
Action: Payment succeeds
Expected: Payment details (amount, payment ID, date)
Template: Payment Receipt with transaction details
```

#### 4. Cancellation Email
```
Action: Request refund
Expected: Cancellation confirmation with refund amount
Template: Booking Cancelled with refund details
```

### Checking Emails

**If emails aren't arriving:**

1. **Check backend console** for email errors:
   ```
   Email sent successfully to user@example.com
   ```

2. **Check spam folder** in your email client

3. **Verify Gmail app password** is correct in `.env`

4. **Check email service logs:**
   - Backend will log: `[EmailService] Email sent successfully`
   - Or: `[EmailService] Failed to send email: <error>`

5. **Test email configuration:**
   ```bash
   cd backend
   npm run start:dev
   # Watch console for "Email service initialized successfully"
   ```

---

## Stripe Webhook Testing

For local development, use Stripe CLI to forward webhooks:

### 1. Install Stripe CLI

**Mac/Linux:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
Download from [Stripe CLI Releases](https://github.com/stripe/stripe-cli/releases)

### 2. Login to Stripe

```bash
stripe login
```

### 3. Forward Webhooks to Local Server

```bash
stripe listen --forward-to localhost:3000/api/v1/payments/webhook
```

This command will output a webhook signing secret:
```
> Ready! Your webhook signing secret is whsec_xxxxx
```

### 4. Update Backend .env

Add the webhook secret from step 3:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 5. Test Webhook Events

In another terminal, trigger test webhooks:

```bash
# Test successful payment
stripe trigger payment_intent.succeeded

# Test failed payment
stripe trigger payment_intent.payment_failed

# Test refund
stripe trigger charge.refunded
```

### 6. Verify Webhook Processing

Check backend console for:
```
[PaymentsService] Handling webhook event: payment_intent.succeeded
[EmailService] Email sent successfully to user@example.com
```

---

## Production Deployment

### Stripe Production Setup

1. **Get Live API Keys:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Copy **Live** publishable key (`pk_live_...`)
   - Copy **Live** secret key (`sk_live_...`)

2. **Set up Webhook Endpoint:**
   - Go to [Webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/v1/payments/webhook`
   - Events to listen: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
   - Copy the webhook signing secret

3. **Update Production .env:**
   ```env
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
   STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   ```

### Email Production Setup

**Option 1: Gmail (Small Scale)**
- Same setup as development
- Limited to 500 emails/day
- Not recommended for production

**Option 2: SendGrid (Recommended)**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=YOUR_SENDGRID_API_KEY
```

**Option 3: AWS SES (Scalable)**
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=YOUR_SMTP_USERNAME
EMAIL_PASSWORD=YOUR_SMTP_PASSWORD
```

### Security Checklist

- [ ] Use live Stripe keys (not test keys)
- [ ] Secure webhook secret in environment variables
- [ ] Enable HTTPS for webhook endpoint
- [ ] Validate webhook signatures
- [ ] Use strong email password or API key
- [ ] Enable 2FA on Stripe account
- [ ] Monitor Stripe dashboard for suspicious activity
- [ ] Set up email sending limits
- [ ] Test email deliverability

---

## Troubleshooting

### Payments Not Working

**Problem:** Payment fails immediately
- **Check:** Stripe publishable key is correct in frontend environment
- **Check:** Backend Stripe secret key is valid
- **Check:** Network tab shows successful API call to `/payments/create-intent`

**Problem:** Payment succeeds but booking not confirmed
- **Check:** Webhook is configured and receiving events
- **Check:** Backend logs show webhook processing
- **Check:** Database payment status is COMPLETED

### Emails Not Sending

**Problem:** No emails received
- **Check:** Email credentials in backend `.env`
- **Check:** Backend console for email errors
- **Check:** Spam folder
- **Check:** Gmail app password is correct (16 characters, no spaces)

**Problem:** Emails going to spam
- **Solution:** Use professional email service (SendGrid, AWS SES)
- **Solution:** Configure SPF and DKIM records for your domain

### Webhook Issues

**Problem:** Webhooks not received in development
- **Check:** Stripe CLI is running and forwarding webhooks
- **Check:** Webhook secret matches in `.env`
- **Check:** Backend is accessible on specified port

**Problem:** Webhook signature verification fails
- **Check:** `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint secret
- **Check:** Raw body is preserved (already configured in main.ts)

---

## Testing Checklist

### Payment Integration

- [ ] Create booking and initiate payment
- [ ] Payment with successful card (`4242 4242 4242 4242`)
- [ ] Payment with declined card (`4000 0000 0000 9995`)
- [ ] Payment with 3D Secure (`4000 0025 0000 3155`)
- [ ] View payment history in dashboard
- [ ] Process refund (admin)
- [ ] Webhook receives payment.succeeded event
- [ ] Booking status updates to CONFIRMED

### Email Notifications

- [ ] Registration sends welcome email
- [ ] Payment sends booking confirmation
- [ ] Payment sends receipt email
- [ ] Refund sends cancellation email
- [ ] Emails have correct formatting
- [ ] Email links work correctly
- [ ] Emails don't go to spam

---

## API Endpoints Reference

### Payment Endpoints

```
POST   /api/v1/payments/create-intent    - Create payment intent
POST   /api/v1/payments/confirm           - Confirm payment
POST   /api/v1/payments/refund            - Process refund (admin)
GET    /api/v1/payments/history           - Get payment history
GET    /api/v1/payments/saved-methods     - Get saved payment methods
POST   /api/v1/payments/webhook           - Stripe webhook (public)
```

### Request/Response Examples

**Create Payment Intent:**
```json
POST /api/v1/payments/create-intent
{
  "bookingId": "booking_123",
  "amount": 15000,
  "currency": "usd",
  "savePaymentMethod": false
}

Response:
{
  "clientSecret": "pi_xxx_secret_yyy",
  "paymentIntentId": "pi_xxx",
  "payment": { ... }
}
```

**Process Refund:**
```json
POST /api/v1/payments/refund
{
  "paymentIntentId": "pi_xxx",
  "amount": 15000,
  "reason": "Customer requested cancellation"
}

Response:
{
  "refund": { ... },
  "success": true
}
```

---

## For Portfolio/Resume

### Talking Points for Interviews

**Stripe Integration:**
- "Implemented end-to-end payment processing with Stripe"
- "Handled webhook events for async payment confirmations"
- "Implemented idempotency and error handling for payment flows"
- "Built admin refund functionality with partial refund support"

**Email Integration:**
- "Integrated transactional email system with Nodemailer"
- "Created responsive HTML email templates"
- "Implemented automated notifications for user lifecycle events"
- "Handled email delivery errors gracefully"

**Full-Stack Skills Demonstrated:**
- Payment gateway integration (Stripe)
- Webhook handling and security
- Email service integration
- Async event processing
- Transaction management
- Error handling and logging
- Security best practices (PCI compliance basics)

### Demo Script

1. "Let me show you the complete booking flow..."
2. "User creates account → Welcome email sent"
3. "User books a hotel → Payment processed with Stripe"
4. "Payment succeeds → Two emails sent (booking + receipt)"
5. "Admin can process refunds → Cancellation email sent"
6. "All transactions tracked in payment history"

---

## Support & Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe Testing:** https://stripe.com/docs/testing
- **Nodemailer Docs:** https://nodemailer.com/
- **Email Templates:** Included in `backend/src/email/email.service.ts`

---

**Last Updated:** 2024-12-27
**Version:** 1.0.0
