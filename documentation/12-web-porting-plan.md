# 12 — Web Porting Plan: MoneyQuest as a Website

Status: plan (not started)
Author: generated from codebase review, Aug 2026

## Verdict

**Yes, this is feasible — and unusually cheap for your stack.** MoneyQuest is an
Expo SDK 54 app, and Expo has first-class web support via React Native Web. The
same TypeScript/React components, Redux store, caching layer, and Appwrite
backend can power both the mobile app and the website. You already own most of
the hard parts:

- Single React/TS codebase (`src/`) — no code to duplicate.
- Appwrite backend already shared by the app, the admin dashboard, and the
  school dashboard.
- A working **KoraPay web checkout + webhook** already built in `school-dashboard`
  (this is the missing web payment path).
- Deploy targets already in use (Vercel for both dashboards).
- A prior web export already exists in `dist/` — so the pipeline has been run
  at least once before.
- `.env` is fully populated (Appwrite, KoraPay, RevenueCat keys all set).

## Recommended approach

**Option A (recommended): React Native Web via Expo — share the codebase.**

```
src/  (screens, services, store, navigation)  ← used by iOS, Android, AND web
```

- Same screens, same Redux state, same Appwrite calls, same caching.
- Differentiator: platform guards around native-only services (~6 files touch
  points), plus a web-only payment path.
- Fastest to working website; ~95% code reuse.

**Option B (not recommended): Rebuild the consumer app in React + Tailwind like
the dashboards.** You would re-implement 27 screens, the whole game/question
flow, Redux state, and caching. Months of work, guaranteed divergence between
platforms. Only makes sense if the product web experience is intentionally
*different* from the app (e.g., marketing site + simplified learning).

**Option C: PWA wrapper around a rebuilt web app** = Option B plus a manifest.
Same cost problem.

## What you already have (reuse inventory)

| Need | Existing asset |
|---|---|
| Web payment checkout | `school-dashboard/src/lib/korapay.ts` (`initializeKoraPayCheckout`, modal script) |
| Payment webhook → Appwrite | `school-dashboard/api/webhooks/korapay.js` (writes `paymentProvider: 'korapay'`, transaction reference) |
| Subscription schema with provider | `subscriptions` collection; `paymentService.ts` already models `korapay` as a provider |
| Premium codes path | `premium_codes` collection + `SchoolCodeEntryScreen` |
| OAuth callback parsing | `src/services/googleAuth.ts` (`createOAuth2Token` + `createSession(userId, secret)`) |
| Deep-link routing config | `AppNavigator.tsx` `linking` config (prefixes + paths) |
| Responsive container | `src/components/ResponsiveContainer.tsx` |
| Backend/API + caching | `src/services/backendApi.ts`, `cacheService.ts`, `cachedBackendApi.ts` |
| Deployment pattern | Vercel (both dashboards); `vercel.json` present in each |
| Web export output dir | `dist/` already exists (stale build) |

## The plan

### Phase 0 — Enable web tooling (~30 min)

1. Install the Expo web trio: `react-native-web`, `react-dom`, `@expo/metro-runtime`
   (match versions to SDK 54 — run `npx expo install`).
2. Add a `web` block to `app.json`: `"web": { "bundler": "metro", "output": "static" }`
   (+ favicon, themeColor).
3. Relax `"orientation": "portrait"` for web (or leave — RNW mostly ignores it).
4. Run `pnpm web`. First boot will surface remaining native import errors — that
   list becomes the Phase 1 checklist.

### Phase 1 — Make native-only services web-safe (the core work)

Statically importing native-only libraries will fail web compilation. Stubs and platform-specific extensions (`*.web.ts`) should be used to isolate the web bundle from native APIs:

1. **RevenueCat** (`react-native-purchases`, `react-native-purchases-ui`) — **no web SDK exists**. Create a platform-specific stub [revenueCatService.web.ts](file:///c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/revenueCatService.web.ts) so methods no-op / return "not configured" and native packages are never imported.
2. **Notifications** (`expo-notifications`) — native only. Create a [notifications.web.ts](file:///c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/notifications.web.ts) stub to handle no-ops cleanly without bundling native dependencies.
3. **App updates** (`appUpdateService`) — store-check prompts are iOS/Android-only. Verify the existing file is web-safe or stub it with `appUpdateService.web.ts`.
4. **Navigation bar / status bar / store review** (`expo-navigation-bar`, `expo-store-review`) — Android/iOS only. Create stubs or add web guards.
5. **Alert / ErrorUtils** — In [App.tsx](file:///c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/App.tsx#L25), the current global handler checks `if (ErrorUtils)`. Since `ErrorUtils` is undefined on browsers, this will throw a `ReferenceError`. It must be fixed to `if (typeof ErrorUtils !== 'undefined')`.
6. **Sounds** (`expo-av`) — has web support (HTML5 audio), but browser autoplay policies block sound playing before initial user interaction. Ensure calls handle autoplay exceptions gracefully.
7. **Appwrite client** — Create [appwrite.web.ts](file:///c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/services/appwrite.web.ts) using the official web `appwrite` SDK instead of `react-native-appwrite`.
   * **Crucial Fix:** Refactor other codebase files (like `auth.ts`, `googleAuth.ts`, etc.) to import `ID`, `Query`, `Permission`, `Role`, etc., from `@/services/appwrite` instead of directly from the package, otherwise they will compile native-dependent SDK modules on web.
   * Profile-picture upload in `auth.ts` needs a web branch: fetch the blob/file from the URI before uploading.
8. **OAuth redirects** — On web, Appwrite handles OAuth sessions using cookies via `createOAuth2Session(...)` instead of `createOAuth2Token`. Unlike mobile, no `secret` or `userId` is returned in the URL query string, so the callback handler inside `googleAuth.ts` must bypass manual `createSession` calls and instead check auth state via `account.get()`.

### Phase 2 — Payments on web via KoraPay

RevenueCat cannot sell on the web (no web SDK, App Store / Google Play only).
Use the path you already built for the school dashboard:

1. Unblock the `'korapay'` case in `src/services/paymentService.ts` for web.
2. Port `school-dashboard/src/lib/korapay.ts` (modal script loader +
   `initializeKoraPayCheckout`) into `src/services/` — keep `KORAPAY_PUBLIC_KEY`
   and `KORAPAY_API_URL` (already in `.env`).
3. Point `notification_url` at a webhook that writes to the consumer
   `subscriptions` collection (either reuse/extend
   `school-dashboard/api/webhooks/korapay.js` or add a function under
   `appwrite/functions/`).
4. `PremiumScreen` on web shows KoraPay + premium-code options instead of
   RevenueCat offerings.
5. Keep both billing paths in the same `subscriptions` collection — the
   `provider` field (`apple_iap` | `google_play` | `korapay`) already exists in
   the types. Store-bought and web-bought premium reconcile in one place.

### Phase 3 — Auth, deep links, sessions

1. **Appwrite console**: Add the web origin to **Allowed Domains** for CORS.
   * **Critical Fix:** Because Appwrite Cloud is on a different domain (`fra.cloud.appwrite.io`) than the web app, browsers like Safari (via ITP) and Brave will block third-party session cookies. A Custom Domain (e.g., `api.moneyquest.app`) must be mapped for the Appwrite endpoint so cookies are first-party.
2. Register web OAuth redirect URLs in Appwrite's Google/Facebook/Twitter providers.
3. **Linking configurations**: The current configuration inside [AppNavigator.tsx](file:///c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/navigation/AppNavigator.tsx) only defines paths for `ForgotPassword` and `Login`. All other screens have no configured paths. Add mapping paths for all main screens (e.g., `Register`, `MainApp`, `Premium`, `Question`, etc.) so that browser back/forward buttons, refreshes, and deep links work correctly on web.
4. Password recovery currently routes to `moneyquestschooldashboard.vercel.app/reset-password` — keep it, or move it to the new site later.

### Phase 4 — Layout & polish

- **Desktop Layout Centering**: [ResponsiveContainer.tsx](file:///c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/src/components/ResponsiveContainer.tsx) does not currently constrain content width. Update it to conditionally wrap children in a margin-centered container with a `maxWidth` of ~480px on web, preventing mobile layouts from stretching excessively on desktop screens.
- Bottom tabs work on web via react-navigation, but consider a top/side nav for desktop (nice-to-have, not required for v1).
- Custom font (`ArialRoundedMTBold.ttf`) already loads via `expo-font` — works on web.
- Add favicon/manifest (PWA installability), meta description, and route-level titles for SEO.
- QA drag interactions (matching questions use `PanResponder`) with mouse.

### Phase 5 — Build & deploy

1. `npx expo export --platform web` → static site in `dist/`.
2. Host on Vercel (pattern already used by both dashboards); wire the web env
   vars (they're in `.env` already) and the custom domain `moneyquest.app`.
3. Keep mobile builds (EAS) untouched — same codebase, two outputs.

## Bottlenecks & problems (ranked)

1. **Payments — the big one.** RevenueCat has no web SDK. Web needs the KoraPay path (already built for school-dashboard). Two billing providers means two places to reconcile premium status — your `subscriptions` collection with a `provider` field is already set up for this. Plan a manual test of the webhook → entitlement grant loop.
2. **Web session persistence & third-party cookies.** Safari's ITP and other browsers block third-party cookies by default. Since Appwrite's default cloud domain (`fra.cloud.appwrite.io`) differs from the web app, cookies will be blocked, logging out users on refresh. Resolving this requires a custom domain for the Appwrite endpoint.
3. **Bundling native packages.** Directly importing native-only code will cause compilation failures during `expo export --platform web`. Creating stubs and platform-specific `*.web.ts` files is necessary to bypass this.
4. **Appwrite native imports in common files.** Eight files import directly from `react-native-appwrite` instead of the local wrapper. Swapping the SDK requires routing these imports through `src/services/appwrite`.
5. **Incomplete web navigation mapping.** The current linking config only supports ForgotPassword and Login. Navigating to other screens will result in raw URLs and page refreshes returning users back to the root welcome screen.
6. **OAuth flow discrepancies.** Appwrite's Web OAuth (cookie-based via `createOAuth2Session`) doesn't return `secret` and `userId` in redirect URLs like mobile token-based OAuth. Mobile deep-link callback parsers will fail on web.
7. **Notifications are native.** Scheduled reminders and admin broadcast pushes cannot exist on web as-is. Options: (a) ship web without them (recommended), (b) later add web push via service worker + VAPID with a backend trigger.
8. **Desktop UX.** The app is portrait-first, full-height, phone-sized. v1 should constrain width using `ResponsiveContainer`.
9. **Global variables crash.** In [App.tsx](file:///c:/Users/USER/Downloads/Documents/Codes/MoneyQuest/App.tsx#L25), checking `if (ErrorUtils)` directly will throw a `ReferenceError` on web browsers where it is undefined.
10. **Bundle size / performance.** No code splitting by default in Expo web; initial load will be heavy.

## Things that'd be needed (checklist)

- [ ] Deps: `react-native-web`, `react-dom`, `@expo/metro-runtime`, `appwrite` (web SDK)
- [ ] `app.json` web block (bundler metro, output static, favicon/themeColor)
- [ ] Platform guards: revenueCatService, notificationService, soundService,
      appUpdateService, navigation-bar, store-review, Alert usage
- [ ] `src/services/appwrite.ts` platform-conditional SDK import + upload branch
- [ ] KoraPay checkout ported from school-dashboard + webhook write to
      `subscriptions`
- [ ] `paymentService.ts` web branch (korapay) + `PremiumScreen` web UI
- [ ] Appwrite console: allowed domain, OAuth web redirects
- [ ] Linking prefixes for the production web domain
- [ ] Responsive container pass (max-width app frame)
- [ ] Favicon / manifest / meta tags
- [ ] `expo export --platform web` + Vercel deploy + env vars + custom domain
- [ ] Smoke test on web (auth, lesson flow, premium gate, profile upload)

## Rough effort

- Phase 0: ~1 hour
- Phase 1 (guards + SDK swap): ~1–2 days
- Phase 2 (web payments): ~1–2 days (reusing school-dashboard code)
- Phase 3 (auth/links/console): ~half a day + console config
- Phase 4 (layout/polish): ~1–2 days
- Phase 5 (build/deploy): ~half a day

Total: roughly **4–7 focused days** to a shippable v1 website, with the mobile
app unchanged and one shared codebase going forward.

---

## Option B in depth: Vite + Tailwind rebuild (KoraPay + PWA)

A full rebuild of the consumer app in the same stack as the two dashboards
(Vite + React + TypeScript + Tailwind), with KoraPay for web payments and the
site shipped as an installable PWA. Decision notes from a codebase review:

### What you'd have to do

1. **Scaffold** a new Vite app modeled on `school-dashboard` (vite.config,
   tailwind.config, vercel.json, `src/lib/appwrite.ts` + `korapay.ts` patterns
   already exist to copy).
2. **Rebuild ~27 screens**: auth (Welcome/Login/Register/ForgotPassword/
   ProfileSetup), onboarding (Splash + 7 flow screens), tutorial (2), main
   (Home/DailyStreak/Leaderboard/Profile), game (QuestionScreen with scenario,
   matching, fill-in-the-gap + LevelCompletion), common (Premium,
   SchoolCodeEntry, PaymentPending), profile (EditProfile/ChangeAvatar).
3. **Rebuild state**: the Redux slices (auth, progress, tutorial, subscription)
   and persistence (AsyncStorage → localStorage) in the new stack (Redux or
   Zustand).
4. **Port services 1:1**: Appwrite auth (email + OAuth via the `appwrite` web
   SDK), `backendApi` + `cachedBackendApi` + `cacheService` (TTL caching),
   subscription service, analytics (Appwrite `analytics_events`),
   school-entitlement claim, premium codes.
5. **Re-implement the game economy exactly**: XP/lives/streaks/monthly-XP
   reset, question fetch policy, leaderboard updates, level completion. Port
   the existing util functions verbatim or mobile and web behavior will
   silently diverge — this is the #1 drift risk.
6. **Payments**: copy `korapay.ts` (modal checkout), point `notification_url`
   at a webhook that writes to the consumer `subscriptions` collection
   (extend `school-dashboard/api/webhooks/korapay.js`). Keep the `provider`
   field so mobile (RevenueCat) and web (KoraPay) entitlements reconcile in
   one collection.
7. **PWA + notifications** — see the reality check below; this is real server
   work, not a free win.
8. **Auth/sessions**: add the web origin to Appwrite Allowed Domains, register
   web OAuth redirect URLs, add react-router routes mirroring the current
   deep-link paths (`reset-password`, `oauth/:result`).
9. **Deploy**: Vercel + custom domain, same as the dashboards.

### PWA and notifications — the reality check

A PWA gives you **installability, an offline shell, and the *capability* to
receive push notifications** — it does not replace your notification system by
itself. Two hard truths:

- **Browsers cannot schedule local notifications.** A closed tab can never fire
  a "7pm reminder" on its own (the Notification Triggers API was abandoned).
  Your current mobile reminders are scheduled on-device by
  `expo-notifications`; on web the scheduling must move **server-side**: a
  cron/serverless job that triggers a push.
- **Web push requires infrastructure you don't have yet**: a service worker
  (push event handler), VAPID public/private keys, an endpoint to store each
  user's push subscription, and a sender (e.g. `web-push` npm package). Your
  template-selection/reminder logic in
  `src/utils/notificationReminderConfig.ts` would be re-implemented on the
  server.

Net: the PWA route makes web notifications *possible*, but it's a separate
backend project (~3–5 days), not a configuration flag. Note this is **not** a
point in favor of the rebuild over Expo web — the same push pipeline would be
needed either way; Expo web just keeps the rest of the code shared.

### How it affects the existing mobile app

- **Shared (no work):** Appwrite project, all collections, webhooks, premium
  codes, leaderboard, subscription schema. A user's progress, streak, and
  premium status work identically on both platforms because both apps read/write
  the same documents.
- **Duplicated (ongoing cost):** every future feature, fix, and content flow is
  built twice. The game economy is the highest-risk duplication — port the util
  functions exactly or XP/lives behavior drifts between platforms.
- **Notifications become two pipelines**: `expo-notifications` on mobile, web
  push on web. Different code, different scheduling models (local vs server).
- **Mobile app stays untouched** — no regression risk to the shipped app.
- **Billing splits**: RevenueCat (mobile) and KoraPay (web) both write to
  `subscriptions` with the existing `provider` field.

### Effort

Scaffold ~0.5d · screens ~5–8d · state + services ~3–4d · game economy ~2–3d ·
payments ~1–2d (code exists to copy) · PWA + push backend ~3–5d · auth/console
~0.5d · deploy ~0.5d → **~3–6 weeks** for feature parity, vs ~4–7 days for the
Expo web route.

### When the rebuild is the right call

- Desktop UX quality matters more than code sharing (full layout control,
  Tailwind speed, cleaner bundles/SEO, no RN-web quirks).
- Your team is far more productive in Vite+Tailwind than in RN (you've already
  built two dashboards in it).
- You accept two maintained codebases and will budget for both.

### When the rebuild is the wrong call

- The website is "the same thing" as the app and parity is the goal — the
  rebuild is then mostly duplicate work, and the notification "win" doesn't
  actually favor it (same push backend either way).
