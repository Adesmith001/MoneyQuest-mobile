import assert from 'node:assert/strict';
import { createHandler } from '../appwrite/functions/diagnostic-triage/src/main.js';

const run = async (body, request, method = 'POST') => {
  const calls = [];
  const result = await createHandler(async (url, options) => {
    calls.push({ url, options });
    return request(url, options, calls.length);
  })({
    req: { method, bodyJson: body, bodyText: JSON.stringify(body), headers: { 'x-appwrite-key': 'scoped-key' } },
    res: { json: (value, status = 200) => ({ value, status }) },
    log: () => {}, error: () => {},
  });
  return { result, calls };
};
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
process.env.APPWRITE_FUNCTION_API_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
process.env.APPWRITE_FUNCTION_PROJECT_ID = '68cc6ab300330cae9c56';
const admin = (url, options, index) => index === 1
  ? response(200, { $id: 'staff-id', labels: ['admin'] })
  : response(200, { total: 1, rows: [{ $id: 'event-id', data: { supportCode: 'MQ-TEST-1' } }] });

const noJwt = await run({ action: 'list' }, admin);
assert.equal(noJwt.result.status, 400);
assert.equal(noJwt.calls.length, 0);
const invalidJwt = await run({ action: 'list', jwt: 'x'.repeat(40) }, () => response(401, {}));
assert.equal(invalidJwt.result.status, 403);
assert.equal(invalidJwt.calls.length, 1);
const ordinary = await run({ action: 'list', jwt: 'x'.repeat(40) }, () => response(200, { labels: [] }));
assert.equal(ordinary.result.status, 403);
assert.equal(ordinary.calls.length, 1);
const allowed = await run({ action: 'list', jwt: 'x'.repeat(40), supportCode: 'MQ-TEST-1' }, admin);
assert.equal(allowed.result.status, 200);
assert.equal(allowed.result.value.incidents[0].supportCode, 'MQ-TEST-1');
assert.ok(allowed.calls[1].url.includes('supportCode'));
assert.ok(!JSON.stringify(allowed.result).includes('scoped-key'));
const changed = await run({ action: 'update', jwt: 'x'.repeat(40), incidentId: '00000000-0000-4000-8000-000000000001', triageStatus: 'resolved' },
  (_, __, index) => index === 1 ? response(200, { $id: 'staff-id', labels: ['ceo'] }) : response(200, { $id: 'event', data: { triageStatus: 'resolved' } }));
assert.equal(changed.result.status, 200);
assert.equal(changed.calls[1].options.method, 'PATCH');
console.log('diagnostic triage function tests passed');
