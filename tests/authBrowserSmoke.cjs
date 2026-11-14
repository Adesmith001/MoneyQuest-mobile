const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_BROWSER_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let sessions = 0;
    let resets = 0;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') return route.continue();
      const path = url.pathname;
      if (!path.startsWith('/v1/')) return route.abort();
      const headers = { 'access-control-allow-origin': 'http://127.0.0.1:4173', 'access-control-allow-credentials': 'true' };
      if (path.endsWith('/account/recovery') && route.request().method() === 'PUT') {
        resets++;
        return route.fulfill({ status: 200, headers, json: {} });
      }
      if (path.endsWith('/account/sessions/email')) {
        sessions++;
        return route.fulfill({ status: 429, headers, json: { code: 429, type: 'general_rate_limit_exceeded' } });
      }
      return route.fulfill({ status: 401, headers, json: { code: 401, type: 'user_unauthorized' } });
    });
    await page.goto('http://127.0.0.1:4173/');
    await page.getByText('Login', { exact: true }).filter({ visible: true }).first().click({ timeout: 15000 });
    const inputs = page.locator('input');
    await inputs.nth(0).fill('test@example.test');
    await inputs.nth(1).fill('test-password-123');
    await page.getByText('Log in', { exact: true }).filter({ visible: true }).last().click();
    await page.getByText(/too many attempts/i).waitFor();
    await page.getByText(/try again in 4:|try again in 5:/i).first().waitFor();
    assert.equal(sessions, 1);
    console.log('Mocked browser sign-in: inline throttle and countdown, one request');

    await page.evaluate(() => {
      history.replaceState({}, '', '/reset-password?userId=test-fixture&secret=test-reset-token');
    });
    await page.reload();
    await page.getByText('Reset your password', { exact: true }).waitFor();
    const passwordFields = page.locator('input[type=password]');
    await passwordFields.nth(0).fill('test-password-456');
    await passwordFields.nth(1).fill('test-password-456');
    await page.getByText('Update password', { exact: true }).click();
    await page.getByText('Password updated', { exact: true }).waitFor();
    assert.equal(resets, 1);
    console.log('Mocked browser recovery: link opened the public form and reset once');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
