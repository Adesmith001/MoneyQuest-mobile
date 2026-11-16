# School Roster Entitlements

The roster flow uses the `school-entitlements` Appwrite Function as the only writer for school batches, invites, and student enrollment claims.

## Collections

Create these collections in the same Appwrite database used by MoneyQuest.

### `school_seat_batches`

Attributes:

- `schoolId`: string, required, 64
- `name`: string, required, 160
- `planType`: string, required, 64
- `seatsPurchased`: integer, required, minimum 1
- `seatsUsed`: integer, required, minimum 0
- `status`: string, required, 32 (`pending_payment`, `active`, `expired`, `revoked`)
- `paymentReference`: string, required, 128
- `expirationDate`: datetime, required
- `createdAt`: datetime, required
- `updatedAt`: datetime, required

Indexes:

- `schoolId_createdAt`: key on `schoolId`, `createdAt`
- `paymentReference`: unique key on `paymentReference`

### `school_invites`

Attributes:

- `schoolId`: string, required, 64
- `batchId`: string, required, 64
- `email`: email, required
- `normalizedEmail`: string, required, 320
- `studentName`: string, optional, 160
- `className`: string, optional, 120
- `inviteCode`: string, required, 32
- `codeHash`: string, required, 64
- `codeLast4`: string, required, 4
- `status`: string, required, 32 (`pending_payment`, `unused`, `claimed`, `revoked`, `expired`)
- `claimedByUserId`: string, optional, 64
- `claimedAt`: datetime, optional
- `expiresAt`: datetime, required
- `createdAt`: datetime, required
- `updatedAt`: datetime, required

Indexes:

- `normalizedEmail_status`: key on `normalizedEmail`, `status`
- `codeHash`: unique key on `codeHash`
- `batchId_status`: key on `batchId`, `status`
- `schoolId_createdAt`: key on `schoolId`, `createdAt`

### Extend existing `school_students`

Add these attributes:

- `batchId`: string, required for new records, 64
- `inviteId`: string, optional, 64
- `studentPublicId`: string, required for new records, 32
- `revokedAt`: datetime, optional
- `revokedBy`: string, optional, 64

Indexes:

- `userId_status`: key on `userId`, `status`
- `inviteId`: unique key on `inviteId`
- `schoolId_status`: key on `schoolId`, `status`

Existing shared-code records can remain. Make the new fields optional temporarily, migrate old rows, then make them required after the migration is complete.

Keep the existing `school_codes` client-read/enrollment permissions while old shared codes are still being used. The mobile app keeps a temporary fallback for those records. After all active shared codes are migrated or expired, remove the legacy client write permissions and retire the old enrollment path.

### Extend existing `school_payments`

Add:

- `batchId`: string, optional, 64
- `codeName`: string, optional, 160

Add a unique index on `transactionReference` if one does not already exist.

## Permissions

Set the database collection permissions for `school_seat_batches` and `school_invites` to empty for client read/write access. The Function uses an Appwrite API key and remains able to read and write them.

For `school_students`, remove direct client create/update/delete permissions. The Function creates claims with user-level read/update permissions. The dashboard should use a future server-side student listing function rather than reading every school row directly.

Set `school_payments` so schools can create pending payment rows only if the current dashboard flow still requires it. Payment status updates must be Function/webhook-only.

The `school-entitlements` Function must allow execution by authenticated users. Do not make its execution permission public.

## Function deployment

Create an Appwrite Function named `school-entitlements` using:

- Runtime: Node.js 20 or newer
- Entrypoint: `src/index.js`
- Install command: `npm install`
- Execute permission: authenticated users
- Function key scopes: `users.read`, `documents.read`, and `documents.write`
- Timeout: at least 60 seconds for roster imports

Deploy the contents of:

```text
appwrite/functions/school-entitlements
```

Set `APPWRITE_DATABASE_ID` to the school database ID. The function uses Appwrite’s runtime endpoint, project ID, and per-execution API key. The following collection variables are optional overrides for the default collection IDs:

```text
APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_SCHOOLS_COLLECTION_ID=schools
APPWRITE_SCHOOL_BATCHES_COLLECTION_ID=school_seat_batches
APPWRITE_SCHOOL_INVITES_COLLECTION_ID=school_invites
APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID=school_students
APPWRITE_SCHOOL_CODES_COLLECTION_ID=school_codes
```

Extend and Revoke require an Appwrite version that supports document transactions. Shared-code enrollments use the existing `school_students` and `school_codes` collections. Roster enrollments also update their matching invite and batch.

## School ownership

Add `ownerUserId` to `schools` and populate it with the Appwrite account ID of the school administrator. The Function currently accepts a matching school email for compatibility with existing records, but `ownerUserId` should become the primary authorization check.

## Payment webhook

Configure KoraPay's signed webhook to reach the deployed `school-dashboard/api/webhooks/korapay.js` endpoint. Set:

```text
KORAPAY_WEBHOOK_SECRET=<webhook-secret>
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=<project-id>
APPWRITE_API_KEY=<server-api-key>
APPWRITE_DATABASE_ID=<database-id>
```

The webhook must be the only path that changes a batch from `pending_payment` to `active`. Verify the signature and make payment handling idempotent using the unique `transactionReference`.

## Email verification

Enable Appwrite email verification. Automatic email claiming intentionally returns `email_unverified` until the account's email is verified. The app retries claiming on later session restoration, and students can use their personal code after verification.

## Pre-launch checks

1. Test a roster with duplicate, invalid, uppercase, and whitespace-padded emails.
2. Confirm a failed payment leaves the batch and invites in `pending_payment`.
3. Confirm a signed successful webhook activates exactly one batch.
4. Claim the same invite twice from two devices; only one enrollment must be created.
5. Revoke a student and confirm the mobile app loses school access on the next online check.
6. Test a 500-row roster and verify the Function completes within its timeout.
7. Confirm one school cannot list or claim another school's invites.
