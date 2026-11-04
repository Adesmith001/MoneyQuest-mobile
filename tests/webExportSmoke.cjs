const assert = require('node:assert/strict');
const { chromium } = require('playwright');

let browser;

(async () => {
  const assetResponses = [];
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_BROWSER_PATH
      ? { executablePath: process.env.PLAYWRIGHT_BROWSER_PATH }
      : {}),
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  page.on('response', (response) => {
    if (response.url().includes('/assets/')) {
      assetResponses.push([
        response.url(),
        response.status(),
        response.headers()['content-type'] || '',
      ]);
    }
  });

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const brokenImages = await page.locator('img').evaluateAll((images) =>
    images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.src)
  );
  const registrations = await page.evaluate(() =>
    navigator.serviceWorker.getRegistrations().then((items) => items.length)
  );
  const moneyquestCaches = await page.evaluate(() =>
    caches.keys().then((keys) => keys.filter((key) => key.startsWith('moneyquest-')))
  );

  assert.ok(assetResponses.length, 'the exported app did not request any bundled assets');
  assert.ok(assetResponses.every(([, status]) => status === 200), assetResponses);
  assert.ok(
    assetResponses.every(([, , contentType]) => !contentType.includes('text/html')),
    assetResponses
  );
  assert.deepEqual(brokenImages, []);
  assert.equal(registrations, 0);
  assert.deepEqual(moneyquestCaches, []);

  console.log(`webExportSmoke: ${assetResponses.length} assets loaded; no worker or stale cache`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  return browser?.close();
});
