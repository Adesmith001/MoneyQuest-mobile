# MoneyQuest Documentation

This folder contains the internal documentation for the current Expo/React Native MoneyQuest app.

## Quick Start

### Prerequisites

- Node.js `18+`
- `pnpm` recommended
- Expo tooling
- Appwrite project access
- iOS Simulator / Android Emulator as needed

### Install and run

```bash
pnpm install
pnpm start
pnpm android
pnpm ios
```

### Environment

The authoritative environment surface is defined in:

- [src/config/environment.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/config/environment.ts:1)
- [src/types/env.d.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/types/env.d.ts:1)

Current key groups:

- Appwrite endpoint, database, collection, and storage IDs
- OAuth client IDs
- `MONEYQUEST_API_BASE_URL`
- `MONEYQUEST_CACHE_TTL_SECONDS`
- `KORAPAY_PUBLIC_KEY` and `KORAPAY_API_URL`
- `REVENUECAT_IOS_KEY` and `REVENUECAT_ANDROID_KEY`
- `OPENAI_API_KEY`

## Current Architecture

MoneyQuest is currently structured around:

- Expo + React Native UI
- Redux Toolkit state management with persistence
- Appwrite for auth and application data
- RevenueCat for in-app subscription products
- AsyncStorage-backed offline-first caching for some app flows

Notable backend-facing domains in the app:

- Learning path and questions
- Auth and profile management
- Lives, streaks, and leaderboard state
- Premium subscriptions and access control
- School subscription enrollment
- Admin access grants
- Notifications and broadcasts

## Documentation Index

### Product requirements

- [Software Requirements Specification](./product-requirements-srs.md)
- [User stories and acceptance criteria](./user-stories.md)

### Core architecture

1. [01-project-structure.md](./01-project-structure.md)
2. [02-navigation-flow.md](./02-navigation-flow.md)
3. [03-state-management.md](./03-state-management.md)
4. [04-services-api.md](./04-services-api.md)
5. [05-component-guide.md](./05-component-guide.md)
6. [06-question-system.md](./06-question-system.md)
7. [07-progress-lives.md](./07-progress-lives.md)

### Operational guides

8. [08-payment-integration.md](./08-payment-integration.md)
9. [09-common-workflows.md](./09-common-workflows.md)
10. [10-troubleshooting.md](./10-troubleshooting.md)
11. [11-api-caching-system.md](./11-api-caching-system.md)
12. [analytics-tracking.md](./analytics-tracking.md)

## Important Source Files

- [App.tsx](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/App.tsx:1)
- [src/navigation/AppNavigator.tsx](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/navigation/AppNavigator.tsx:1)
- [src/store/index.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/store/index.ts:1)
- [src/config/appwrite.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/config/appwrite.ts:1)
- [src/services/subscriptionService.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/subscriptionService.ts:1)
- [src/services/revenueCatService.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/revenueCatService.ts:1)
- [src/services/cacheService.ts](/abs/path/c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/cacheService.ts:1)

## Notes

- The repo includes a `pnpm-lock.yaml`, so `pnpm` is the most consistent default.
- `package.json` currently exposes only `start`, `android`, `ios`, and `web` scripts.
- Some older guides in this folder may describe historical flows; this index now reflects the current entry points and active integrations.
