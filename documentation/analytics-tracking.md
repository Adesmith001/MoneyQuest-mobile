# MoneyQuest Analytics Tracking Setup

This repo now emits analytics events from the mobile app and reads them in `moneyquest-dashboard`.

The dashboard and the app must both point at the same Appwrite project: `Money-quest`.

## 1. Appwrite collection to create

Create this collection in the `Money-quest` project and database `68cc891e001ebcafceeb`.

- Collection ID: `analytics_events`

Recommended attributes:

- `eventName` `string` required
- `userId` `string` required
- `anonymousId` `string` required
- `sessionId` `string` required
- `occurredAt` `datetime` required
- `eventDate` `string` required
- `eventMonth` `string` required
- `screenName` `string`
- `featureName` `string`
- `platform` `string`
- `appVersion` `string`
- `appBuild` `string`
- `deviceType` `string`
- `deviceModel` `string`
- `osName` `string`
- `osVersion` `string`
- `valueNumber` `double` nullable
- `valueText` `string`
- `propertiesJson` `string` required

Recommended indexes:

- `eventName`
- `userId`
- `eventDate`
- `eventMonth`
- `occurredAt`
- compound index on `eventName + eventDate` if Appwrite allows it in your plan

Notes:

- Keep document security off if you want collection-level permissions to control access.
- If you keep document security on, make sure the mobile app can create documents and the dashboard admin can read them.
- `propertiesJson` should be large enough to hold serialized event metadata.

## 2. Permissions

Recommended minimum:

- Mobile app users: create documents in `analytics_events`
- Dashboard/admin users: read documents in `analytics_events`

If you use Appwrite teams or labels for admins, grant read access there instead of opening reads broadly.

## 3. What the code now tracks

The mobile app now emits events for:

- app open and session start/end
- screen views
- login success/failure
- signup start/success/failure
- onboarding step completion and onboarding completion
- lesson start and lesson completion
- question flagging
- paywall views
- trial starts
- checkout starts
- subscription activation
- subscription restore success
- subscription cancellation
- premium code redemption
- notification permission changes
- notification received/opened
- store review prompt requests
- support and bug-report link opens
- app errors and fatal errors

This now supports dashboard reporting for:

- DAU
- WAU
- returning users
- average session time
- D1 retention
- D7 retention
- D30 retention
- lesson completion rate
- weekly active learners
- lessons completed per week
- feature usage
- conversion to paid as a live directional rate

## 4. PM metrics that still need external data

These cannot be made fully accurate from the app alone:

- true crash rate: add Crashlytics or Sentry
- app store rating: pull from App Store Connect and Play Console
- support tickets: connect Zendesk, Intercom, Freshdesk, or your support inbox
- refunds: store payment and store refund webhooks
- CPA: join ad spend to attributed signups
- visitor to signup conversion: connect website analytics or install attribution
- top traffic source: use UTMs, install referrer, or an MMP instead of only self-reported referral source

## 5. What you still need to do

1. Create the `analytics_events` collection in Appwrite.
2. Add the attributes and indexes above.
3. Grant the right create/read permissions.
4. Restart the Expo app and `moneyquest-dashboard`.
5. Use the app for a few real sessions so event data exists.
6. Open the dashboard analytics page and confirm session, onboarding, lesson, and feature events are appearing.
7. Decide which external tools will own crash reporting, store ratings, support tickets, refunds, and attribution.
