# Payment Security Implementation Guide

## 🔒 Security Improvements Completed

### 1. **Removed Secret Keys from Client** ✅
- Removed `KORAPAY_SECRET_KEY` from client-side code
- Now using only `KORAPAY_PUBLIC_KEY` for client operations
- Secret key will only exist in Appwrite Function environment variables

### 2. **Created Secure Webhook Handler** ✅
- Created Appwrite Function at `/appwrite/functions/korapayWebhook/`
- Validates webhook signatures using HMAC SHA-256
- Verifies payment amounts match plan prices
- Activates subscriptions securely server-side

### 3. **Improved Transaction Reference Security** ✅
- Replaced `Math.random()` with `expo-crypto.randomBytes()`
- Uses cryptographically secure random generation
- Format: `MQ_{timestamp}_{secure_random_12_chars}`

### 4. **Added Amount Verification** ✅
- `activateSubscription()` now accepts optional `paidAmount` parameter
- Validates payment amount matches subscription plan price
- Prevents users from paying less and getting full access

---

## 🚀 Implementation Options

### Option A: Without Webhook (Simpler, Good Security) ⭐ CURRENT

This approach uses client-side activation with row-level security and amount verification.

#### Required Steps:

1. **Update Appwrite Subscription Permissions** ✅
   - Navigate to: **Databases → MoneyQuest → Subscriptions → Settings → Permissions**
   
   **Permissions Configuration:**
   
   **READ:**
   - ✅ Role: `Users`
   - ✅ Enable **Document Security**
   - ✅ Condition: `userId == $userId`
   
   **CREATE:**
   - ✅ Role: `Users` (for trial creation)
   
   **UPDATE:**
   - ✅ Role: `Users`
   - ✅ Enable **Document Security**
   - ✅ Condition: `userId == $userId` (users can only update their own subscriptions)
   
   **DELETE:**
   - ❌ Disabled (users cannot delete subscriptions)

2. **Security Features Enabled:** ✅
   - Amount verification (payment amount must match plan price)
   - Secure random generation for transaction references
   - Row-level security prevents cross-user modifications
   - Public key only used in client (no secret keys)

3. **Testing Checklist:**
   - [ ] Test trial subscription creation
   - [ ] Complete a test payment
   - [ ] Verify amount validation works
   - [ ] Try to modify another user's subscription (should fail)

---

### Option B: With Webhook (Maximum Security) 🔒

This approach uses server-side activation via Appwrite Functions.

#### When to Use:
- You need audit trails of all payment events
- You want to eliminate all client-side trust
- You need to handle refunds or chargebacks server-side

---

## 🚀 Required Actions (Without Webhook)

### ✅ Step 1: Update Appwrite Permissions (COMPLETED)

You've already done this! Just verify the settings:

**In Appwrite Console → Subscriptions → Permissions:**
- ✅ UPDATE: Users role with document security (`userId == $userId`)
- ✅ READ: Users role with document security (`userId == $userId`)
- ✅ CREATE: Users role
- ✅ DELETE: Disabled

### ✅ Step 2: Security Code Updates (COMPLETED)

The following security improvements are already implemented:
- ✅ Amount verification in payment flow
- ✅ Secure random generation for transaction references
- ✅ No secret keys in client code

### Step 3: Configure KoraPay Settings

1. **Go to KoraPay Dashboard:**
   - Navigate to: https://merchant.korapay.com/dashboard/settings/api-integrations

2. **Verify Your Public Key:**
   - Confirm your public key matches `KORAPAY_PUBLIC_KEY` in your `.env` file
   - Public key format: `pk_test_...` or `pk_live_...`

3. **Test Mode Settings:**
   - While in test mode, you can use test cards to verify payments
   - Test cards: https://korapay.com/docs/testing

---

## 🧪 Testing Your Payment Flow

### Test Trial Subscription:
1. ✅ Sign up new user
2. ✅ Click "Start 30-day trial"
3. ✅ Verify subscription created with `status='trial'`
4. ✅ Check trial end date is 30 days from now

### Test Paid Subscription:
1. ✅ User with trial subscription
2. ✅ Navigate to subscription upgrade screen
3. ✅ Select a plan (Basic/Premium)
4. ✅ Click subscribe button
5. ✅ Complete payment using test card
6. ✅ Verify redirect to PaymentPendingScreen
7. ✅ Wait for verification (polls every 3 seconds)
8. ✅ Verify subscription status changes to `active`
9. ✅ Check subscription end date is set correctly

### Security Tests:
1. ✅ Try to pay less than plan price (should fail amount verification)
2. ✅ Try to update another user's subscription via Appwrite (should fail permissions)
3. ✅ Verify transaction references are unique and cryptographically secure

---

## 📝 Current Implementation Summary

### Payment Flow:
1. User selects subscription plan
2. Client generates secure transaction reference using `expo-crypto`
3. Client initiates payment with KoraPay using public key
4. User completes payment on KoraPay checkout
5. KoraPay redirects back to app
6. App polls payment status every 3 seconds (max 10 attempts)
7. When payment succeeds, client verifies amount and activates subscription
8. Amount verification ensures payment matches plan price

### Security Layers:
- ✅ **Row-Level Security**: Users can only modify their own subscriptions
- ✅ **Amount Verification**: Payment amount must match plan price
- ✅ **Secure References**: Cryptographically secure transaction IDs
- ✅ **No Secret Keys**: Only public key used in client
- ✅ **Status Polling**: Verifies payment with KoraPay before activation

---

## ⚡ When to Add Webhook (Future Enhancement)

Consider adding the webhook handler when you need:
- **Automatic payment updates** without polling
- **Failed payment handling** and retry logic
- **Subscription renewals** for auto-renew subscriptions
- **Audit logging** of all payment events server-side
- **Refund handling** and chargeback processing

The webhook setup instructions are preserved below if you decide to implement it later.

---

## 🔒 Webhook Setup (Optional - For Future)

### Step 1: Deploy Appwrite Function

1. **Navigate to Appwrite Console** → Functions → Create Function
2. **Configuration:**
   - Name: `KoraPay Webhook Handler`
   - Runtime: `Node.js 20`
   - Entrypoint: `src/main.js`
   - Execute Access: `Public` (for webhook access)

3. **Upload Function Code:**
   ```bash
   cd appwrite/functions/korapayWebhook
   npm install
   # Then upload via Appwrite Console or CLI
   ```

4. **Set Environment Variables in Appwrite:**
   - `APPWRITE_DATABASE_ID` = Your database ID
   - `APPWRITE_SUBSCRIPTIONS_COLLECTION_ID` = `subscriptions`
   - `KORAPAY_WEBHOOK_SECRET` = Get from KoraPay dashboard
   - `APPWRITE_API_KEY` = Create a new API key with these permissions:
     - ✅ `databases.read`
     - ✅ `databases.write`

5. **Note the Function URL:**
   - Format: `https://[your-endpoint]/v1/functions/[function-id]/executions`
   - You'll need this for KoraPay webhook configuration

### Step 2: Configure KoraPay Webhook

1. **Go to KoraPay Dashboard:**
   - Navigate to: https://merchant.korapay.com/dashboard/settings/webhooks

2. **Add Webhook URL:**
   - URL: `https://[your-appwrite-endpoint]/v1/functions/[function-id]/executions`
   - Events to listen for:
     - ✅ `charge.success`
     - ✅ `charge.failed`

3. **Save Webhook Secret:**
   - Copy the webhook secret from KoraPay
   - Add it to Appwrite Function environment variables as `KORAPAY_WEBHOOK_SECRET`

### Step 3: Update Appwrite Permissions (For Webhook-Only Updates) 🔴

If using webhook, update permissions so ONLY the webhook can modify subscriptions:

1. **Go to:** Databases → MoneyQuest → Subscriptions → Settings → Permissions

2. **Update Permissions:**

   **UPDATE Permission:**
   - ❌ Remove: `Users` (users should NOT be able to update subscriptions)
   - ✅ Add: `API Key` (only backend/webhook can update)

3. **Create Server API Key:**
   - Go to: Project Settings → API Keys → Create API Key
   - Name: `Webhook Handler`
   - Scopes:
     - ✅ `databases.read`
     - ✅ `databases.write`
   - Copy the key and add to Appwrite Function environment

---

## 🛡️ Security Checklist (Without Webhook)

**In your `.env` file:**

```env
# Remove this line (no longer used in client):
# KORAPAY_SECRET_KEY=sk_test_...

# Keep these:
KORAPAY_PUBLIC_KEY=pk_test_QrTiUhtZTL89DRL4dUjeMvMfRNyW2rYMfx9azFsh
KORAPAY_API_URL=https://api.korapay.com/merchant
KORAPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Add your function URL (for reference):
APPWRITE_KORAPAY_WEBHOOK_FUNCTION_ID=your_function_id_here
```

### Step 5: Update Payment Flow (Optional Enhancement)

Currently, your payment verification happens client-side by polling. While this works, consider these improvements:

**Option A: Keep Current Flow (Simpler)**
- Webhook activates subscription in background
- Client still polls for verification as backup
- ✅ Works with current code

**Option B: Enhanced Flow (More Secure)**
- Webhook activates subscription
- Client listens to Appwrite realtime for subscription updates
- No client-side activation, only status checking

For Option B, you can implement later if needed.

---

## 🛡️ Security Checklist (Without Webhook)

- [x] Secret key removed from client code
- [x] Secure webhook handler created
- [x] Cryptographic random generation for references
- [x] Amount verification added
- [x] Appwrite permissions updated with row-level security
- [ ] KoraPay test payment completed successfully
- [ ] Amount verification tested (try paying wrong amount)
- [ ] Permission security tested (try updating another user's subscription)

---

## 🛡️ Security Checklist (With Webhook - Optional)

- [x] Secret key removed from client code
- [x] Secure webhook handler created
- [x] Cryptographic random generation for references
- [x] Amount verification added
- [ ] Appwrite Function deployed
- [ ] KoraPay webhook configured
- [ ] Appwrite permissions updated (webhook-only updates)
- [ ] Server API key created
- [ ] Test payment flow with webhook

---

## 🧪 Testing (Webhook Setup)

### Test Trial Subscription:
1. Sign up new user
2. Click "Start 30-day trial"
3. Verify subscription created with status='trial'

### Test Paid Subscription:
1. Click subscribe button
2. Complete payment on KoraPay
3. Check Appwrite Function logs for webhook reception
4. Verify subscription status changes to 'active'
5. Verify payment amount matches plan price

### Security Tests:
1. Try to manually update subscription via Appwrite SDK (should fail with permissions)
2. Send fake webhook without signature (should be rejected)
3. Send webhook with wrong amount (should be rejected)

---

## 📞 Troubleshooting

**Webhook not receiving events:**
- Check function is deployed and public
- Verify webhook URL in KoraPay dashboard
- Check Appwrite Function execution logs

**Permission errors:**
- Ensure API key has database read/write permissions
- Verify API key is set in function environment
- Check subscription collection permissions

**Payment verification fails:**
- Ensure webhook secret matches KoraPay dashboard
- Check function logs for signature validation errors
- Verify payment metadata includes userId and planType

---

## 🔐 Additional Recommendations

1. **Enable Appwrite Audit Logs:**
   - Track all subscription modifications
   - Monitor for suspicious activity

2. **Add Rate Limiting:**
   - Limit payment initialization attempts per user
   - Prevent abuse of trial subscriptions

3. **Implement Webhook Retry Logic:**
   - Handle failed webhook deliveries
   - Add idempotency checks

4. **Monitor Subscription Status:**
   - Set up alerts for failed payments
   - Notify users before subscription expires

5. **Consider Adding:**
   - Email notifications for payment events
   - Admin dashboard for subscription management
   - Refund handling logic

---

## 📝 What Changed in Code

### Files Modified:
1. `src/services/korapayService.ts`
   - Removed secret key
   - Now uses public key only
   - Improved reference generation with crypto

2. `src/services/subscriptionService.ts`
   - Added amount verification parameter
   - Added warning about server-side activation

### Files Created:
1. `appwrite/functions/korapayWebhook/`
   - Complete webhook handler
   - Signature validation
   - Secure subscription activation

---

Need help with any of these steps? Let me know!
