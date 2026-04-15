# Manual Premium Grant Function

Appwrite Function source for previewing and granting time-limited premium access by email.

## Required function environment variables

- `APPWRITE_DATABASE_ID`
- `APPWRITE_USERS_COLLECTION_ID`
- `APPWRITE_SUBSCRIPTIONS_COLLECTION_ID`
- `APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID`
- `APPWRITE_ADMINS_COLLECTION_ID` (recommended: `admin_users`)
- `MONEYQUEST_ADMIN_ALLOWLIST_EMAILS`

## Required function scopes

- `databases.read`
- `databases.write`

## Actions

### 1. `preview` / `grant`

```json
{
  "action": "preview",
  "targetEmail": "student@example.com",
  "expiresAt": "2026-06-30",
  "reason": "CEO complimentary premium"
}
```

Use `action: "grant"` to apply the change.

### 2. `list_admins`

```json
{
  "action": "list_admins"
}
```

### 3. `add_admin`

```json
{
  "action": "add_admin",
  "adminEmail": "cofounder@example.com"
}
```

## Admin bootstrap + runtime admin model

- `MONEYQUEST_ADMIN_ALLOWLIST_EMAILS` is your bootstrap/super-admin list.
- Runtime admins are stored in `APPWRITE_ADMINS_COLLECTION_ID` (`admin_users`).
- Any bootstrap or runtime admin can add more runtime admins with `add_admin`.

## Suggested `admin_users` schema

- `email` (string, required)
- `status` (string, optional, default `active`)
- `userId` (string, optional)
- `addedByUserId` (string, optional)
- `addedByEmail` (string, optional)
- `createdAt` (datetime/string)
- `updatedAt` (datetime/string)

## Deploy checklist

1. Create/verify `admin_users` table in the same Appwrite database.
2. Add the first super-admin email to `MONEYQUEST_ADMIN_ALLOWLIST_EMAILS` in Function env.
3. Set these Function env variables:
   - `APPWRITE_DATABASE_ID`
   - `APPWRITE_USERS_COLLECTION_ID`
   - `APPWRITE_SUBSCRIPTIONS_COLLECTION_ID`
   - `APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID`
   - `APPWRITE_ADMINS_COLLECTION_ID=admin_users`
   - `MONEYQUEST_ADMIN_ALLOWLIST_EMAILS=ceo@example.com`
4. Ensure the function API key has `databases.read` and `databases.write`.
5. Deploy the function code:

```bash
cd appwrite-functions/manual-premium-grant
npm install
```

Then deploy from Appwrite Console:
- Functions -> `manual-premium-grant` -> Deployments -> Create deployment
- Upload the folder or connect the repo path
- Redeploy after env changes

## Mobile app env

Set these in app `.env` for the mobile client:

- `APPWRITE_MANUAL_PREMIUM_FUNCTION_ID=manual-premium-grant`
- `MONEYQUEST_ADMIN_ALLOWLIST_EMAILS=ceo@example.com`
- `APPWRITE_ADMINS_COLLECTION_ID=admin_users`
