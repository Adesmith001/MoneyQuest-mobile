/* MoneyQuest service worker
 *
 * Strategy (deploy-safe):
 * - Cache name embeds a version. Bump CACHE_VERSION on every deploy that
 *   changes the app shell (index.html, manifest, icons, or any bundle).
 *   Old caches are deleted on activate, so stale shells never survive.
 * - The JS/CSS bundles are content-hashed by Expo, so once fetched they are
 *   immutable — cache-first is safe for them.
 * - Navigation requests (index.html / deep links) use stale-while-revalidate:
 *   instant load from cache, then update the cache in the background. On the
 *   first visit after a deploy the fresh shell is fetched from the network.
 * - Everything else (Appwrite API, backend, images from other origins) is
 *   network-only, so the app never serves stale server data.
 */

const CACHE_VERSION = 'v2';
const SHELL_CACHE = `moneyquest-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `moneyquest-static-${CACHE_VERSION}`;

// The app shell: navigation entry points + PWA metadata.
const SHELL_URLS = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png'];

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
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('moneyquest-') && key !== SHELL_CACHE && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Content-hashed bundle assets: cache-first (they are immutable).
  if (sameOrigin && /\/(_expo\/static\/js\/|_expo\/static\/css\/|\/assets\/)/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
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

  // App shell: HTML navigations + deep-link routes. SPA falls back to index.html.
  if (sameOrigin && request.mode === 'navigate') {
    event.respondWith(
      caches.open(SHELL_CACHE).then((cache) =>
        cache.match('/').then((cached) => {
          const network = fetch(request)
            .then((response) => {
              if (response.ok) cache.put('/', response.clone());
              return response;
            })
            .catch(() => cached);
          return cached ? cached : network;
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
