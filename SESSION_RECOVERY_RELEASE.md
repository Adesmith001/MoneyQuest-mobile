# November 11 session and profile remediation

## Cause

The reported `MQ-KD4S4-VRUL` startup failure came from an anonymous Appwrite
session. The Auth account had no email or name, its `users` profile lookup
returned 404, and profile creation returned 400 because the live `age` column
was required. The startup gate presented the resulting database error as a
connection problem. Incognito worked because it had a separate session.

## Release sequence

1. Deploy the web app containing the anonymous-session guard in
   `AuthService.getCurrentUser`. Verify that opening the site with an anonymous
   Appwrite session ends that session and shows login without a `users` write.
2. Change `Money-quest` database `68cc891e001ebcafceeb`, `users.age` from
   required to optional, with no default and the existing range 7–100. This
   lets an email account with no profile create an incomplete profile and enter
   the existing profile-setup flow, which asks for the real age. Do not use a
   placeholder age.
3. Verify a valid email account with no profile can sign in, complete profile
   setup, refresh, and sign out. Verify an anonymous session and a real network
   error reach their distinct recovery paths.
4. Review `error-monitor` for new `session_check` incidents. Roll back the web
   deployment if an anonymous account gains a `users` profile or another
   student's account appears in the browser. If rolling back, restore the
   original required `age` constraint as well.

The live `age` column was restored to **required** after staging verification;
the schema change in step 2 is still part of the production release.

## Existing accounts

The read-only November 12 audit found 251 Auth accounts and 206 `users` rows.
Forty-two email accounts and three anonymous accounts lack a profile row.
The email accounts can be provisioned when they next sign in after step 2;
the anonymous accounts must not receive student profiles. No accounts or
profiles were changed during the audit.
