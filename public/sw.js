/* MoneyQuest service worker
 *
 * Strategy (deploy-safe):
 * - Navigation HTML is network-first and bundles are content-hashed, so app
 *   deploys do not require a manual cache bump. Change CACHE_VERSION only
 *   when the worker's cache policy changes. One previous static cache stays
 *   available so an already-open tab can finish loading its hashed chunks.
 * - The JS/CSS bundles are content-hashed by Expo, so once fetched they are
 *   immutable — cache-first is safe for them.
 * - Navigation requests use the current network shell, with cached HTML only
 *   as an offline fallback. This avoids serving an old shell after a deploy.
 * - Everything else (Appwrite API, backend, images from other origins) is
 *   network-only, so the app never serves stale server data.
 */

const CACHE_VERSION = 'v3';
const SHELL_CACHE = `moneyquest-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `moneyquest-static-${CACHE_VERSION}`;

// The app shell: navigation entry points + PWA metadata.
const SHELL_URLS = ['/', '/manifest.json', '/icons/logo-white.png', '/icons/maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const olderStatic = keys.filter(key => key.startsWith('moneyquest-static-') && key !== STATIC_CACHE).sort();
        const obsolete = keys.filter(key => key.startsWith('moneyquest-shell-') && key !== SHELL_CACHE)
          .concat(olderStatic.slice(0, -1));
        return Promise.all(obsolete.map(key => caches.delete(key)));
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Content-hashed bundle assets: cache-first (they are immutable).
  if (sameOrigin && /^\/(?:_expo\/static\/(?:js|css)\/|assets\/)/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // App shell: HTML navigations + deep-link routes. SPA falls back to index.html.
  if (sameOrigin && request.mode === 'navigate') {
    event.respondWith(
      caches.open(SHELL_CACHE).then((cache) =>
        cache.match('/').then((cached) => {
          return fetch(request)
            .then((response) => {
              if (response.ok) cache.put('/', response.clone());
              return response;
            })
            .catch(error => {
              if (cached) return cached;
              throw error;
            });
        })
      )
    );
    return;
  }

  // PWA metadata and icons: cache-first with network fill.
  if (sameOrigin && (url.pathname === '/manifest.json' || url.pathname.startsWith('/icons/'))) {
    event.respondWith(
      caches.open(SHELL_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Everything else (API calls, cross-origin resources): network only.
});
