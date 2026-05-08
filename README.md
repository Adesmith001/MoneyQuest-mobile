# MoneyQuest

MoneyQuest is an Expo/React Native mobile app for gamified financial education. It combines structured lessons, streaks, XP, lives, subscriptions, notifications, and leaderboard progress into a Duolingo-style learning flow.

## Current Stack

- React Native `0.81.4`
- React `19.1.0`
- Expo SDK `54`
- TypeScript `5.9`
- Redux Toolkit + `redux-persist`
- Appwrite for auth, database, and storage
- RevenueCat for in-app subscriptions
- Expo Notifications for reminders and admin broadcasts

## Current Product Areas

- Progressive sections and levels
- Scenario, matching, and fill-in-the-gap question flows
- XP, lives, streaks, and leaderboard updates
- Google/Facebook/Twitter auth support in config
- Premium access with a 14-day trial
- Store-managed subscriptions through RevenueCat
- School-code access and admin access grants
- Local caching for learning-path data and subscription state
- Store-update prompts on iOS and Android

## Project Layout

```text
src/
|-- components/
|-- config/
|-- hooks/
|-- navigation/
|-- screens/
|-- services/
|-- store/
|-- types/
`-- utils/

documentation/
|-- README.md
|-- 01-project-structure.md
|-- 02-navigation-flow.md
|-- 03-state-management.md
|-- 04-services-api.md
|-- 05-component-guide.md
|-- 06-question-system.md
|-- 07-progress-lives.md
|-- 08-payment-integration.md
|-- 09-common-workflows.md
|-- 10-troubleshooting.md
|-- 11-api-caching-system.md
`-- analytics-tracking.md
```

## Development Setup

### Prerequisites

- Node.js `18+`
- A package manager: `pnpm` is recommended because the repo includes `pnpm-lock.yaml`
- Expo tooling
- Android Studio and/or Xcode if you need native builds
- An Appwrite project

### Install

```bash
pnpm install
```

If you prefer npm:

```bash
npm install
```

### Run

```bash
pnpm start
pnpm android
pnpm ios
pnpm web
```

The app scripts currently map to:

- `start`: `expo start`
- `android`: `expo run:android`
- `ios`: `expo run:ios`
- `web`: `expo start --web`

## Environment Variables

Create a root `.env` file. The app currently reads these values from `@env` via [src/config/environment.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/config/environment.ts:1).

```env
# Appwrite
APPWRITE_ENDPOINT=
APPWRITE_PROJECT_ID=
APPWRITE_DATABASE_ID=
APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_QUESTIONS_COLLECTION_ID=questions
APPWRITE_LEADERBOARD_COLLECTION_ID=leaderboard
APPWRITE_LEVELS_COLLECTION_ID=levels
APPWRITE_USER_PROGRESS_COLLECTION_ID=user_progress
APPWRITE_STREAKS_COLLECTION_ID=streaks
APPWRITE_ANALYTICS_COLLECTION_ID=analytics_events
APPWRITE_SUBSCRIPTIONS_COLLECTION_ID=subscriptions
APPWRITE_BROADCASTS_COLLECTION_ID=broadcasts
APPWRITE_ADMIN_ACCESS_GRANTS_COLLECTION_ID=admin_access_grants
APPWRITE_STORAGE_BUCKET_ID=

# OAuth
GOOGLE_CLIENT_ID=
FACEBOOK_APP_ID=
TWITTER_CLIENT_ID=

# Backend / caching
MONEYQUEST_API_BASE_URL=
MONEYQUEST_CACHE_TTL_SECONDS=259200

# Payments
KORAPAY_PUBLIC_KEY=
KORAPAY_API_URL=
REVENUECAT_IOS_KEY=
REVENUECAT_ANDROID_KEY=

# Optional
OPENAI_API_KEY=
```

Notes:

- `MONEYQUEST_CACHE_TTL_SECONDS` controls learning-path cache freshness. Current fallback is `259200` seconds (3 days).
- School collection IDs exist as hardcoded fallbacks in the environment layer and are not currently imported from `.env`.
- RevenueCat keys are required for App Store / Google Play purchases.

## Backend Expectations

MoneyQuest expects an Appwrite database with, at minimum, these collections:

- `users`
- `questions`
- `leaderboard`
- `levels`
- `user_progress`
- `streaks`
- `analytics_events`
- `subscriptions`
- `broadcasts`
- `admin_access_grants`

Additional collection usage also exists for:

- `premium_codes`
- school-related collections used by the school-access flow

Storage is used for user-uploaded profile assets.

## Subscriptions

The live mobile purchase path is store-first:

- iOS uses RevenueCat + App Store products
- Android uses RevenueCat + Google Play products
- The app models `monthly` and `annual` plans
- Both plans currently expose a 14-day trial in [src/types/subscription.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/types/subscription.ts:1)

KoraPay configuration still exists in the codebase for premium-code and external-payment related workflows, but direct external checkout is currently blocked in the mobile app by [src/services/paymentService.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/paymentService.ts:1).

## Caching

Learning-path caching is handled by [src/services/cacheService.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/cacheService.ts:1) and [src/services/cachedBackendApi.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/cachedBackendApi.ts:1).

- Sections and levels are cached in Redux plus AsyncStorage
- Cache freshness is TTL-based and environment-driven
- Question requests are session-deduplicated, but not persisted like sections/levels
- Cache version bumps clear learning-path cache without wiping user progress caches

## Notifications and Updates

- Local reminders and admin broadcast sync live in `src/services/notifications.ts`
- Store update prompts live in `src/services/appUpdateService.ts`
- Android billing permission is enabled in `app.json`
- Deep links include the `moneyquest://` scheme and `https://moneyquest.app/reset-password`

## Documentation

See [documentation/README.md](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/documentation/README.md:1) for the full internal docs index.

## Verification

There are currently no dedicated `test`, `lint`, or `typecheck` scripts in `package.json`. Typical manual verification commands are:

```bash
pnpm start
npx tsc --noEmit
```
