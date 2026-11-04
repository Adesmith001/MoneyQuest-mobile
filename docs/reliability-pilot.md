# Login and loading reliability pilot

## Before production

Deploy this build to a Vercel preview URL and record the current production deployment as the rollback target. In Appwrite, confirm that `analytics_events` accepts `feature_used`, `sign_up_completed`, and `app_error` records. A missing analytics collection does not block the app, but it prevents remote comparison.

## School pilot

Use two school computers and five test accounts before opening the release to the class. On each computer, test a fresh visit, email signup, same-tab refresh, sign-out, and a second student's login. Repeat in Chrome and Edge if both are installed. Open the app in a second tab while the first student is signed in; the second tab must start at login. After the second student signs in, the first tab must leave the first student's dashboard. Never put student passwords in screenshots or logs.

Have the school contact send the time, browser name and version, action being attempted, and a photo of any error screen with its support code. The support code appears on session, lesson, and startup recovery screens. Match it to `propertiesJson.support_code` in Appwrite's `analytics_events` collection. `stage`, `duration_ms`, `appVersion`, and the event name identify where the delay occurred.

## Release gate and rollback

Compare the pilot's `first_usable_screen` and `home_first_content` duration distributions with the existing production release, using the same devices and network. Release to the wider group only if all signup, refresh, account-switch, and sign-out checks pass, no blank or endless loading screen occurs, and the pilot's 75th-percentile times improve. Keep the pilot running for one school session before widening access.

If any student sees another student's data, a successful signup returns to login, or startup/content stalls without a retry path, restore the recorded prior Vercel deployment immediately and keep the support codes for diagnosis. A service or network outage can still prevent login; the expected behavior is a visible retry screen.
