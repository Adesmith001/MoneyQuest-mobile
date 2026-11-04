/* Retires MoneyQuest's previous cache-first service workers.
 *
 * Keep this file at /sw.js for one deployment cycle so browsers with an
 * existing registration receive the update, clear stale assets, and release
 * control. The app intentionally does not register a replacement worker.
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.unregister(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('moneyquest-'))
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});
