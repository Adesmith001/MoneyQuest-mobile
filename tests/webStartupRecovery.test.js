const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

assert.match(html, /30000/, 'the startup fallback should allow slow bundles to finish');
assert.match(html, /__moneyquestRetryStartup/, 'Retry should run the recovery handler');
assert.match(html, /moneyquest-.*startsWith|startsWith\(['"]moneyquest-/s, 'recovery should clear MoneyQuest caches');
assert.match(html, /__moneyquestAppMounted/, 'the fallback timer should be cleared once React mounts');
assert.match(app, /__moneyquestAppMounted/, 'the app should notify the static bootstrap when mounted');
assert.ok(
  vercel.rewrites.some((rule) => rule.source === '/(.*)' && rule.destination === '/index.html'),
  'the SPA fallback should use a filesystem-aware rewrite so static bundle rules still apply'
);
assert.ok(
  vercel.headers.some((rule) =>
    rule.source === '/_expo/static/(.*)' &&
    rule.headers.some((header) => header.key === 'Cache-Control' && header.value.includes('immutable'))
  ),
  'Expo hashed bundles should have immutable cache headers'
);

console.log('Web startup recovery checks passed.');
