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

## 🚀 Required Actions

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

### Step 3: Update Appwrite Permissions 🔴 CRITICAL

**Current Issue:** Users can directly modify subscription records!

**Fix in Appwrite Console:**

1. **Go to:** Databases → MoneyQuest → Subscriptions → Settings → Permissions

2. **Update Permissions:**

   **READ Permission:**
   - ✅ Keep: `Users` (users can read their own subscriptions)
   - ❌ Remove: `Any` (remove public read access)
   - Add Document-level security: `userId == $user_id`

   **CREATE Permission:**
   - ✅ Keep: `Users` (for trial creation)
   - ❌ Remove: `Any`

   **UPDATE Permission:**
   - ❌ Remove: `Users` (users should NOT be able to update subscriptions)
   - ❌ Remove: `Any`
   - ✅ Add: `API Key` (only backend/webhook can update)

   **DELETE Permission:**
   - ❌ Keep disabled (current setting is correct)

3. **Create Server API Key:**
   - Go to: Project Settings → API Keys → Create API Key
   - Name: `Webhook Handler`
   - Scopes:
     - ✅ `databases.read`
     - ✅ `databases.write`
   - Copy the key and add to Appwrite Function environment

### Step 4: Update Environment Variables

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

## 🛡️ Security Checklist

- [x] Secret key removed from client code
- [x] Secure webhook handler created
- [x] Cryptographic random generation for references
- [x] Amount verification added
- [ ] Appwrite Function deployed
- [ ] KoraPay webhook configured
- [ ] Appwrite permissions updated (CRITICAL)
- [ ] Server API key created
- [ ] Environment variables updated
- [ ] Test payment flow

---

## 🧪 Testing

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
