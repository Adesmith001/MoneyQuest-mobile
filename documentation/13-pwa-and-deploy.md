# M5 — PWA + Vercel deployment (consumer web app)

This documents what was built and exactly how to deploy the MoneyQuest consumer
web app. The **mobile app is unaffected** — everything here lives in `public/`,
`app.json` web fields, and `vercel.json`, none of which the native builds read.

## What was added

| Piece | Location | Purpose |
|---|---|---|
| PWA manifest | `public/manifest.json` | Installability: name, icons (any + maskable), theme/background color, standalone display |
| App shell template | `public/index.html` | Custom Expo web template: manifest link, apple-touch-icon, theme-color, description, SW registration. Keeps Expo's `%LANG_ISO_CODE%` / `%WEB_TITLE%` placeholders and the `#root` div, so `expo export` still injects the bundle |
| Service worker | `public/sw.js` | Cache versioning (`CACHE_VERSION`), precaches the shell, stale-while-revalidate for navigations, cache-first for content-hashed bundles, network-only for APIs |
| PWA icons | `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` | Generated from `assets/icon.png` via `scripts/generate-pwa-icons.cjs` (uses `@expo/image-utils`, no new deps) |
| app.json web fields | name/shortName/themeColor/backgroundColor/description/icons/appleTouchIcon | Metadata for the generated HTML + reference to the icon set |
| Vercel config | `vercel.json` | Expo build command, `dist` output, SPA rewrite for deep links, caching headers (SW never cached, hashed assets immutable) |
| npm scripts | `web:export`, `web:icons` | `pnpm web:export` builds `dist/`; `pnpm web:icons` regenerates icons |

## Key design decisions

1. **Cache versioning (`sw.js`)** — the cache name embeds `CACHE_VERSION`
   (`moneyquest-shell-v1`). On the *next* deploy, bump `CACHE_VERSION` in
   `public/sw.js` to a new value (e.g. `v2`) and the service worker deletes all
   old `moneyquest-*` caches on activate. This is the deploy-safe pattern: old
   shells never survive a deploy, and content-hashed bundles are safe to cache
   forever because their filenames change on any code change.
2. **SW registration guard** — the script in `index.html` only registers on
   `https:` or `localhost`, so dev mode never fights the browser cache.
3. **API calls are network-only** in the SW — Appwrite/Railway data is never
   served stale from a cache.

## Deploying (Vercel)

1. **Create the Vercel project** pointing at this repo (framework: Expo is
   auto-detected; `vercel.json` overrides the build/output explicitly).
   - Build command: `npx expo export --platform web --output-dir dist`
     (already in `vercel.json`)
   - Output directory: `dist` (already in `vercel.json`)
2. **Env vars** — copy the values from `.env` into the Vercel project settings
   (Settings → Environment Variables). `react-native-dotenv` falls back to real
   env vars at build time, so no `.env` file is needed on Vercel. Required:
   - `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID`
   - All `APPWRITE_*_COLLECTION_ID` values, `APPWRITE_STORAGE_BUCKET_ID`
   - `MONEYQUEST_API_BASE_URL`, `MONEYQUEST_CACHE_TTL_SECONDS`
   - `KORAPAY_PUBLIC_KEY`, `KORAPAY_API_URL`
   - `REVENUECAT_WEB_KEY` (only if using RevenueCat Web Billing)
3. **Appwrite console (one-time)**:
   - Add the production domain (e.g. `moneyquest.app`) to **Allowed Domains**
     for CORS.
   - Register web OAuth redirect URLs for Google/Facebook/Twitter.
   - **Critical (Safari/Brave session persistence):** Appwrite Cloud lives on a
     different domain (`fra.cloud.appwrite.io`) than the web app, so third-party
     session cookies get blocked. Map a custom domain (e.g.
     `api.moneyquest.app`) to the Appwrite endpoint so cookies are first-party,
     and point `APPWRITE_ENDPOINT` at it.
4. **Deep links / refresh** — `vercel.json` rewrites every path to
   `index.html` and the app's linking config (web origin prefix + screen paths
   for `question`, `level-complete`, tabs, etc.) restores the active screen on
   refresh.

## Deploy checklist (every release)

- [ ] Bump `CACHE_VERSION` in `public/sw.js` if the app shell changed
- [ ] `pnpm web:export` builds clean
- [ ] Deploy `dist/` to Vercel
- [ ] Smoke-test: refresh a deep link, confirm install prompt (manifest),
      confirm SW registered (`Application → Service Workers` in DevTools)

## Local testing

```bash
pnpm web                    # dev server on :8081 (uses the same template)
pnpm web:export             # production build into dist/
npx serve dist -s -l 8080   # SPA-preview the production build locally
```
