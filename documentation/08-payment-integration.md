# Payment and Premium Access

## Overview

MoneyQuest currently supports multiple premium-access paths:

- Store-managed subscriptions through RevenueCat
- Appwrite-backed subscription records
- School subscription enrollment
- Temporary admin access grants
- Premium code redemption

The primary mobile purchase flow is store-first:

- iOS: App Store via RevenueCat
- Android: Google Play via RevenueCat

The app still contains KoraPay-related logic, but direct external checkout is not currently enabled in the mobile purchase entry point.

## Current Plan Model

Plan definitions live in [src/types/subscription.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/types/subscription.ts:1).

Current plan values:

- `monthly`: `NGN 2000`
- `annual`: `NGN 24000`
- Trial duration: `14 days`

## Runtime Components

### RevenueCat

[src/services/revenueCatService.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/revenueCatService.ts:1) is responsible for:

- SDK configuration
- Loading current offerings
- Resolving monthly/annual packages
- Presenting the RevenueCat paywall
- Presenting RevenueCat Customer Center
- Reading the active `premium` entitlement

### Appwrite subscription records

[src/services/subscriptionService.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/subscriptionService.ts:1) is responsible for:

- Creating 14-day trial records
- Activating subscriptions from verified provider data
- Persisting subscription state locally for offline checks
- Cancelling and toggling auto-renew for non-store-managed records
- Redeeming premium codes

### Access control

[src/components/SubscriptionGuard.tsx](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/components/SubscriptionGuard.tsx:1) enforces premium access.

Access resolution order is currently:

1. School subscription lookup
2. Admin access grant lookup
3. Offline-first local subscription cache
4. RevenueCat entitlement fallback
5. Background Appwrite refresh

### Purchase entry

[src/services/paymentService.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/paymentService.ts:1) routes users to:

- Apple in-app purchase flow on iOS
- Google Play purchase flow on Android

For `korapay`, it currently returns a failure message indicating external checkout is not available in the mobile app.

## Required Environment Variables

At minimum, configure:

```env
APPWRITE_DATABASE_ID=
APPWRITE_SUBSCRIPTIONS_COLLECTION_ID=subscriptions
REVENUECAT_IOS_KEY=
REVENUECAT_ANDROID_KEY=
KORAPAY_PUBLIC_KEY=
KORAPAY_API_URL=
```

KoraPay keys may still be needed for premium-code or backend-assisted flows even though direct mobile checkout is disabled.

## Appwrite Data Requirements

### `subscriptions` collection

The app expects a `subscriptions` collection with fields covering:

- `userId`
- `planType`
- `status`
- `paymentProvider`
- `trialStartDate`
- `trialEndDate`
- `subscriptionStartDate`
- `subscriptionEndDate`
- `lastPaymentDate`
- `nextBillingDate`
- `autoRenew`
- `paymentReference`
- `externalTransactionId`
- `originalTransactionId`
- `providerProductId`
- `receiptReference`
- `korapayTransactionReference`
- `korapayCustomerReference`
- `amount`
- `currency`
- `createdAt`
- `updatedAt`

### Related collections

The premium flow also touches:

- `admin_access_grants`
- `premium_codes`
- school-related collections used by `schoolService`

## RevenueCat Setup

### Configure products

You need:

- A RevenueCat app per store as appropriate
- An active offering
- Monthly and annual packages
- A `premium` entitlement

If RevenueCat is misconfigured, the app surfaces offering-related errors from [src/services/revenueCatService.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/revenueCatService.ts:1).

### Identity

When a user signs in, the app links the Appwrite user ID to RevenueCat so purchases can be restored across installs and devices.

## Offline-First Behavior

Subscription access is intentionally resilient offline:

- The latest Appwrite subscription record is cached in AsyncStorage per user
- Access checks use local data first
- RevenueCat can fill gaps for store subscribers after reinstall or device change
- Background refresh updates the cache when the network is available

## School and Grant Access

Premium access is not limited to individual subscriptions.

The guard also allows access through:

- School enrollment
- Temporary admin grants

That means "premium required" behavior should be evaluated against the full guard flow, not just the `subscriptions` collection.

## Premium Codes

`subscriptionService.redeemPremiumCode()` supports premium code redemption.

Current behavior:

- Looks up the code in `premium_codes`
- Prevents duplicate usage
- Marks the code as redeemed before activation
- Activates or creates a subscription record

## Verification Checklist

### Trial flow

- New user can create a trial subscription
- Trial status is `trial`
- Trial banner/countdown renders correctly
- Access remains available during the 14-day window

### Store purchase flow

- RevenueCat is configured for the current platform
- Current offering contains the correct packages
- Purchase grants the `premium` entitlement
- Appwrite subscription data syncs or local access still works via RevenueCat fallback

### Access-control flow

- Expired subscriptions route to the premium screen
- School users bypass individual subscription checks
- Admin-grant users bypass individual subscription checks
- Offline users with cached premium access still enter protected screens

## Known Current Constraints

- Direct external KoraPay checkout is not active in the mobile app entry path
- Store-managed subscriptions must be managed in the App Store or Play Store
- Some premium-related records may exist in Appwrite even when RevenueCat remains the source of truth for store entitlement state
