import assert from 'node:assert/strict';
import { cutoffFor, createHandler } from '../appwrite/functions/diagnostic-retention/src/main.js';

const now = Date.parse('2026-11-10T12:00:00.000Z');
assert.equal(cutoffFor(now), '2026-10-11T12:00:00.000Z');
process.env.APPWRITE_FUNCTION_API_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
process.env.APPWRITE_FUNCTION_PROJECT_ID = 'test';
const calls = [];
const result = await createHandler(async (url, options) => {
  calls.push({ url, method: options.method || 'GET' });
  if (options.method === 'DELETE') return { ok: true };
  return { ok: true, json: async () => ({ rows: [{ $id: 'old-incident' }] }) };
}, () => now)({
  req: { headers: { 'x-appwrite-key': 'key' } },
  res: { json: (value, status = 200) => ({ value, status }) },
  log: () => {}, error: () => {},
});
assert.equal(result.status, 200);
assert.equal(result.value.removed, 1);
assert.ok(calls[0].url.includes('2026-10-11'));
assert.equal(calls[1].method, 'DELETE');
console.log('diagnostic retention function tests passed');
