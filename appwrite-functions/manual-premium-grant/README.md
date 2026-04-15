# Manual Premium Grant Function

Appwrite Function source for previewing and granting time-limited premium access by email.

## Required function environment variables

- `APPWRITE_DATABASE_ID`
- `APPWRITE_USERS_COLLECTION_ID`
- `APPWRITE_SUBSCRIPTIONS_COLLECTION_ID`
- `APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID`
- `MONEYQUEST_ADMIN_ALLOWLIST_EMAILS`

## Required function scopes

- `documents.read` and `documents.write`
- or `rows.read` and `rows.write` (newer Appwrite scope naming)

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

## Admin model

- Static admins only.
- Admin access is controlled by `MONEYQUEST_ADMIN_ALLOWLIST_EMAILS`.
- Add multiple emails as comma-separated values in env.

## Deploy checklist

1. Add admin email(s) to `MONEYQUEST_ADMIN_ALLOWLIST_EMAILS` in Function env.
2. Set these Function env variables:
   - `APPWRITE_DATABASE_ID`
   - `APPWRITE_USERS_COLLECTION_ID`
   - `APPWRITE_SUBSCRIPTIONS_COLLECTION_ID`
   - `APPWRITE_SCHOOL_STUDENTS_COLLECTION_ID`
   - `MONEYQUEST_ADMIN_ALLOWLIST_EMAILS=ceo@example.com`
3. Ensure the function API key has `documents.read` and `documents.write` (or `rows.read`/`rows.write` in newer scope naming).
4. Deploy the function code:

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
