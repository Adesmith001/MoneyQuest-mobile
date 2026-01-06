# KoraPay Payment Integration - Setup Checklist

## ✅ Completed Implementation

### 1. Environment Configuration
- ✅ Added KoraPay environment variables to `.env`
- ✅ Updated `env.d.ts` with type definitions
- ✅ Exported KoraPay config in `env.ts`

### 2. Type Definitions
- ✅ Created `src/types/subscription.ts`
  - Subscription types and interfaces
  - Plan configurations (Monthly & Annual)
  - Payment intent types

### 3. Services
- ✅ Created `src/services/korapayService.ts`
  - Payment initialization
  - Payment verification
  - Transaction reference generation
  
- ✅ Created `src/services/subscriptionService.ts`
  - Trial creation
  - Subscription activation
  - Access validation
  - Status management

### 4. Screens
- ✅ Created `src/screens/common/PremiumScreen.tsx`
  - Plan selection UI (matches design)
  - Trial start functionality
  - Payment initialization
  
- ✅ Created `src/screens/common/PaymentPendingScreen.tsx`
  - Payment verification polling
  - Success/failure handling
  - Subscription activation

### 5. Components
- ✅ Created `src/components/SubscriptionGuard.tsx`
  - Access control wrapper
  - Trial countdown display
  - Automatic redirect to Premium

### 6. Navigation
- ✅ Updated `src/navigation/AppNavigator.tsx`
  - Added Premium screen route
  - Added PaymentPending route
  
- ✅ Updated `src/navigation/MainTabNavigator.tsx`
  - Wrapped with SubscriptionGuard
  - Trial banner integration

### 7. Documentation
- ✅ Created comprehensive guide at `documentation/08-payment-integration.md`

---

## 🔴 Action Required

### Step 1: KoraPay Account Setup
1. **Sign up for KoraPay**
   - Visit: https://korapay.com
   - Create merchant account
   - Complete KYC verification

2. **Get API Credentials**
   - Navigate to: Settings → API Keys
   - Copy these values:
     ```
     Public Key (starts with pk_test_ or pk_live_)
     Secret Key (starts with sk_test_ or sk_live_)
     Merchant ID
     Webhook Secret
     ```

3. **Update `.env` file**
   Replace placeholder values:
   ```env
   KORAPAY_PUBLIC_KEY=pk_test_YOUR_ACTUAL_KEY
   KORAPAY_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY
   KORAPAY_MERCHANT_ID=YOUR_MERCHANT_ID
   KORAPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
   ```

### Step 2: Appwrite Database Setup

1. **Create Subscriptions Collection**
   - Collection ID: `subscriptions`
   - Add to `.env`:
     ```env
     APPWRITE_SUBSCRIPTIONS_COLLECTION_ID=subscriptions
     ```

2. **Add Collection Attributes**
   Run this in Appwrite Console or use Appwrite CLI:
   
   ```bash
   # String attributes
   userId (string, required, size: 255)
   planType (string, required, size: 50, default: "monthly")
   status (string, required, size: 50, default: "trial")
   korapayTransactionReference (string, optional, size: 255)
   korapayCustomerReference (string, optional, size: 255)
   currency (string, required, size: 10, default: "NGN")
   
   # DateTime attributes
   trialStartDate (datetime, required)
   trialEndDate (datetime, required)
   subscriptionStartDate (datetime, optional)
   subscriptionEndDate (datetime, optional)
   lastPaymentDate (datetime, optional)
   nextBillingDate (datetime, optional)
   createdAt (datetime, required)
   updatedAt (datetime, required)
   
   # Integer attributes
   amount (integer, required, default: 0)
   
   # Boolean attributes
   autoRenew (boolean, required, default: false)
   ```

3. **Set Collection Permissions**
   ```
   Create: Any authenticated user
   Read: User can read own documents (userId = $userId)
   Update: User can update own documents (userId = $userId)
   Delete: Admin only
   ```

4. **Create Indexes**
   ```
   Index 1: userId (ASC)
   Index 2: status (ASC)
   Index 3: userId + status (compound)
   Index 4: createdAt (DESC)
   ```

### Step 3: Integrate Trial Creation in Onboarding

Find your last onboarding screen (likely `WelcomeSuccessScreen.tsx` or `AvatarSelectionScreen.tsx`) and add:

```typescript
import { subscriptionService } from '../../services/subscriptionService';

const handleContinueToApp = async () => {
  try {
    // Create trial subscription
    await subscriptionService.createTrialSubscription(user.$id);
    
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  } catch (error) {
    console.error('Error creating trial:', error);
    Alert.alert('Error', 'Failed to initialize trial. Please contact support.');
  }
};
```

### Step 4: Install Dependencies

The implementation uses these packages (verify they're installed):

```bash
npm install axios react-native-appwrite
# or
pnpm install axios react-native-appwrite
```

### Step 5: Test the Integration

#### Test in Development:
1. Clear app data
2. Create new account
3. Complete onboarding
4. Verify trial subscription created
5. Navigate to Premium screen
6. Test payment flow with KoraPay test card

#### KoraPay Test Cards:
```
Card: 5061020000000000094
CVV: 123
Expiry: Any future date
OTP: 123456
```

---

## 🎯 What Happens Next

### User Flow After Setup:

1. **New User Registration**
   - User creates account
   - Completes onboarding
   - **Trial subscription automatically created** (30 days)
   - User gets full access to app

2. **During Trial (Days 1-30)**
   - User sees countdown banner: "⏰ X days left in trial"
   - Full app access
   - Can upgrade anytime via Profile or banner

3. **Trial Expiration (Day 31)**
   - App access blocked automatically
   - User redirected to Premium screen
   - Must subscribe to continue

4. **After Payment**
   - Subscription activated
   - Access restored immediately
   - Next billing date set

### Payment Flow:
```
Premium Screen → KoraPay Checkout → Payment → Verification → Activation → App Access
```

---

## 🔧 Customization Options

### Change Trial Duration:
In `src/services/subscriptionService.ts`, modify:
```typescript
const trialEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
// Change 30 to desired number of days
```

### Change Plan Prices:
In `src/types/subscription.ts`, update:
```typescript
export const SUBSCRIPTION_PLANS: Record<PlanType, SubscriptionPlan> = {
  monthly: {
    price: 3000, // Change this
    // ...
  },
  annual: {
    price: 35000, // Change this
    // ...
  },
};
```

### Change Trial Banner Appearance:
Modify `src/components/SubscriptionGuard.tsx` styles

### Hide/Show Trial Banner:
```typescript
<SubscriptionGuard showTrialInfo={false}>
  {/* No banner shown */}
</SubscriptionGuard>
```

---

## 📱 Features Included

✅ 30-day free trial system
✅ Monthly subscription (₦3,000/month)
✅ Annual subscription (₦35,000/year)
✅ Trial countdown banner
✅ Automatic access blocking on expiry
✅ KoraPay payment integration
✅ Payment verification
✅ Subscription status management
✅ Protected routes/screens
✅ Beautiful Premium screen (matches your design)
✅ Payment success/failure handling
✅ Automatic subscription activation

---

## 🚨 Important Notes

1. **Security**
   - NEVER commit `.env` file
   - Use test keys in development
   - Use live keys in production only

2. **Testing**
   - Always test with KoraPay sandbox first
   - Test all payment scenarios (success, failure, timeout)
   - Test trial expiry edge cases

3. **Production**
   - Switch to live KoraPay keys
   - Set up webhooks for reliability
   - Monitor payment success rates
   - Implement error logging

4. **User Experience**
   - Trial starts automatically after onboarding
   - Clear countdown shown to users
   - Easy upgrade path
   - Graceful handling of expired subscriptions

---

## 📞 Support

If you encounter issues:

1. **Check logs**: Console errors in services
2. **Verify Appwrite**: Collection structure and permissions
3. **Test KoraPay**: Use test cards first
4. **Review docs**: `documentation/08-payment-integration.md`

**KoraPay Support**:
- Email: support@korapay.com
- Docs: https://docs.korapay.com

---

## ✅ Final Checklist Before Launch

- [ ] KoraPay credentials added to `.env`
- [ ] Appwrite subscriptions collection created
- [ ] Collection permissions configured
- [ ] Trial creation integrated in onboarding
- [ ] Tested complete flow with test cards
- [ ] Verified access control works
- [ ] Tested trial expiry
- [ ] Tested payment verification
- [ ] Ready for production deployment
- [ ] Switched to live KoraPay keys (production only)

---

## 🎉 You're All Set!

Once you complete the setup steps above, your payment integration will be fully functional. Users will automatically get 30-day trials and be prompted to subscribe when trials expire.

**Next Steps:**
1. Get KoraPay credentials
2. Set up Appwrite collection
3. Test the flow
4. Launch! 🚀
