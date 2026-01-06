# Payment Integration Guide - MoneyQuest

## Overview
MoneyQuest uses KoraPay for payment processing with a 30-day free trial system. Users can choose between monthly (₦3,000) or annual (₦35,000) subscription plans.

## Payment Flow

### 1. User Journey
```
Registration → Onboarding → Free Trial (30 days) → Payment Required
```

- **After Registration**: User completes onboarding
- **Trial Period**: 30 days of free access
- **Day 30**: User must subscribe to continue
- **Option**: User can start trial later by clicking "Start 30-day free trial"

### 2. Trial System
- Automatic 30-day trial created after onboarding completion
- Trial countdown displayed in app header
- After 30 days, access is blocked until payment

### 3. Payment Process
1. User selects plan (Monthly/Annual)
2. Clicks "Start 30-day free trial" OR subscribes immediately
3. Redirected to KoraPay checkout page
4. Payment verification
5. Subscription activated

---

## Setup Instructions

### 1. KoraPay Configuration

#### Get Your KoraPay Credentials:
1. Sign up at [KoraPay](https://korapay.com)
2. Navigate to Settings → API Keys
3. Copy the following:
   - Public Key
   - Secret Key
   - Merchant ID
   - Webhook Secret

#### Add to `.env` file:
```env
KORAPAY_PUBLIC_KEY=pk_test_your_public_key_here
KORAPAY_SECRET_KEY=sk_test_your_secret_key_here
KORAPAY_MERCHANT_ID=your_merchant_id_here
KORAPAY_WEBHOOK_SECRET=your_webhook_secret_here
KORAPAY_API_URL=https://api.korapay.com/merchant/api/v1
```

⚠️ **Important**: 
- Use **test keys** for development
- Use **live keys** for production
- NEVER commit `.env` file to version control

### 2. Appwrite Database Setup

#### Create Subscriptions Collection:
1. Go to Appwrite Dashboard → Database
2. Create new collection: `subscriptions`
3. Add the following attributes:

| Attribute | Type | Required | Array | Default |
|-----------|------|----------|-------|---------|
| userId | string | Yes | No | - |
| planType | string | Yes | No | monthly |
| status | string | Yes | No | trial |
| trialStartDate | datetime | Yes | No | - |
| trialEndDate | datetime | Yes | No | - |
| subscriptionStartDate | datetime | No | No | - |
| subscriptionEndDate | datetime | No | No | - |
| lastPaymentDate | datetime | No | No | - |
| nextBillingDate | datetime | No | No | - |
| autoRenew | boolean | Yes | No | false |
| korapayTransactionReference | string | No | No | - |
| korapayCustomerReference | string | No | No | - |
| amount | integer | Yes | No | 0 |
| currency | string | Yes | No | NGN |

#### Set Permissions:
- **Create**: Any authenticated user
- **Read**: User can read own documents
- **Update**: User can update own documents
- **Delete**: Admin only

#### Create Indexes:
1. Index on `userId` (key: userId_index)
2. Index on `status` (key: status_index)
3. Compound index on `userId` + `status`

### 3. Update User Collection

Add subscription-related fields to your users collection:
- `subscriptionId` (string, optional)
- `hasActiveSubscription` (boolean, default: false)
- `trialStartDate` (datetime, optional)

---

## Integration with Onboarding

### Update WelcomeSuccessScreen or Last Onboarding Step:

```typescript
import { subscriptionService } from '../../services/subscriptionService';

// After onboarding completion
const handleComplete = async () => {
  try {
    // Create trial subscription
    await subscriptionService.createTrialSubscription(user.$id);
    
    // Navigate to main app
    navigation.replace('MainTabs');
  } catch (error) {
    console.error('Error creating trial:', error);
  }
};
```

---

## Usage

### Protecting Routes with SubscriptionGuard

Wrap any component/screen that requires active subscription:

```typescript
import SubscriptionGuard from '../components/SubscriptionGuard';

<SubscriptionGuard showTrialInfo={true}>
  <YourProtectedContent />
</SubscriptionGuard>
```

**Props:**
- `showTrialInfo` (boolean): Show trial countdown banner

### Checking Subscription Status

```typescript
import { subscriptionService } from '../services/subscriptionService';

const checkAccess = async () => {
  const result = await subscriptionService.checkAndUpdateSubscriptionAccess(userId);
  
  if (result.hasAccess) {
    // User has access
  } else {
    // Navigate to Premium screen
  }
};
```

### Manual Navigation to Premium

```typescript
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();
navigation.navigate('Premium');
```

---

## Testing

### Test Flow:

1. **Create New Account**
   - Register → Complete onboarding
   - Verify trial subscription created

2. **Check Trial Status**
   - App should show trial countdown
   - Access should be granted

3. **Test Payment (Sandbox)**
   - Use KoraPay test cards
   - Test Card: `5061020000000000094`
   - CVV: `123`, Expiry: Any future date

4. **Verify Payment**
   - Check payment verification works
   - Subscription status updates to `active`
   - Access continues after payment

5. **Test Expiry**
   - Manually update `trialEndDate` to past date
   - App should block access
   - Premium screen should show

### Test Cards (KoraPay Sandbox):

| Card Number | Type | Expected Result |
|-------------|------|-----------------|
| 5061020000000000094 | Mastercard | Success |
| 4084080000000409 | Visa | Success |

---

## Production Checklist

Before going live:

- [ ] Replace test KoraPay keys with live keys
- [ ] Test complete payment flow in production
- [ ] Set up KoraPay webhooks for automatic verification
- [ ] Configure subscription renewal reminders
- [ ] Test trial expiry edge cases
- [ ] Implement subscription cancellation flow
- [ ] Add subscription management in Profile
- [ ] Test payment failure handling
- [ ] Verify data privacy compliance
- [ ] Set up payment monitoring/alerts

---

## KoraPay Webhook Setup (Optional but Recommended)

### Create Webhook Endpoint (Backend Required):

```typescript
// Backend endpoint: /api/webhooks/korapay
app.post('/api/webhooks/korapay', async (req, res) => {
  const signature = req.headers['x-korapay-signature'];
  const payload = req.body;
  
  // Verify webhook signature
  if (!koraPayService.validateWebhookSignature(JSON.stringify(payload), signature)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Handle payment success
  if (payload.event === 'charge.success') {
    const { reference, metadata } = payload.data;
    await subscriptionService.activateSubscription(
      metadata.userId,
      metadata.planType,
      reference
    );
  }
  
  res.status(200).send('OK');
});
```

### Configure in KoraPay Dashboard:
1. Go to Settings → Webhooks
2. Add endpoint URL
3. Select events: `charge.success`, `charge.failed`

---

## Troubleshooting

### Common Issues:

**1. Payment not verifying**
- Check KoraPay API keys are correct
- Verify network connectivity
- Check transaction reference is valid

**2. Trial not working**
- Verify subscription collection exists
- Check Appwrite permissions
- Verify user ID is correct

**3. Access denied unexpectedly**
- Check subscription dates
- Verify `hasActiveSubscription` logic
- Check for expired subscriptions

**4. Webhook not receiving events**
- Verify webhook URL is publicly accessible
- Check webhook signature validation
- Verify event types are enabled

---

## Support

For KoraPay support:
- Email: support@korapay.com
- Docs: https://docs.korapay.com

For MoneyQuest issues:
- Check logs in `src/services/korapayService.ts`
- Check logs in `src/services/subscriptionService.ts`
- Verify Appwrite collection structure

---

## Files Created

### Types:
- `src/types/subscription.ts` - Subscription types and interfaces

### Services:
- `src/services/korapayService.ts` - KoraPay payment integration
- `src/services/subscriptionService.ts` - Subscription management

### Screens:
- `src/screens/common/PremiumScreen.tsx` - Plan selection
- `src/screens/common/PaymentPendingScreen.tsx` - Payment verification

### Components:
- `src/components/SubscriptionGuard.tsx` - Access control

### Configuration:
- `.env` - Updated with KoraPay keys
- `env.d.ts` - Type definitions for env variables
- `env.ts` - Environment exports
- `src/navigation/AppNavigator.tsx` - Added Premium routes
- `src/navigation/MainTabNavigator.tsx` - Wrapped with SubscriptionGuard

---

## Next Steps

1. **Get KoraPay credentials** and update `.env`
2. **Create subscriptions collection** in Appwrite
3. **Test the complete flow** with sandbox
4. **Implement webhook endpoint** (optional)
5. **Go live** with production keys
