const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const origin = new URL(process.env.MONEYQUEST_SMOKE_URL || 'http://127.0.0.1:4173').origin;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_BROWSER_PATH });
  try {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
      let sessions = 0;
      let resets = 0;
      await page.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (!url.pathname.startsWith('/v1/')) {
          return url.origin === origin && request.method() === 'GET' ? route.continue() : route.abort();
        }
        const headers = {
          'access-control-allow-origin': origin,
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
          'access-control-allow-headers': request.headers()['access-control-request-headers'] ?? 'content-type',
        };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        if (url.pathname.endsWith('/account/recovery') && request.method() === 'PUT') {
          resets++;
          return route.fulfill({ status: 200, headers, json: {} });
        }
        if (url.pathname.endsWith('/account/sessions/email')) {
          sessions++;
          return route.fulfill({ status: 429, headers, json: { code: 429, type: 'general_rate_limit_exceeded' } });
        }
        return route.fulfill({ status: 401, headers, json: { code: 401, type: 'user_unauthorized' } });
      });
      await page.goto(origin);
      await page.getByText('Login', { exact: true }).filter({ visible: true }).first().click({ timeout: 25000 });
      const inputs = page.locator('input');
      await inputs.nth(0).fill('test@example.test');
      await inputs.nth(1).fill('test-password-123');
      await page.getByText('Log in', { exact: true }).filter({ visible: true }).last().click();
      await page.getByText(/too many attempts/i).waitFor();
      assert.equal(await page.getByText('Sign-in problem', { exact: true }).isVisible(), true,
        `The sign-in error dialog should be visible at ${width}px`);
      await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
      await page.getByText(/too many attempts/i).waitFor({ state: 'hidden' });
      await page.getByText(/try again in 4:|try again in 5:/i).first().waitFor();
      assert.equal(sessions, 1);
      console.log(`Mocked browser sign-in at ${width}px: dismissible error dialog and countdown, one request`);

      if (width === 390) {
        await page.goto(origin + '/reset-password?userId=test-fixture&secret=test-reset-token');
        await page.getByText('Reset your password', { exact: true }).waitFor();
        const passwordFields = page.locator('input[type=password]');
        await passwordFields.nth(0).fill('test-password-456');
        await passwordFields.nth(1).fill('test-password-456');
        await page.getByText('Update password', { exact: true }).click();
        await page.getByText('Password updated', { exact: true }).waitFor();
        assert.equal(resets, 1);
        console.log('Mocked browser recovery: link opened the public form and reset once');
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
