import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createHandler, validateIncident } from '../appwrite/functions/error-monitor/src/main.js';

const sample = () => ({
  eventId: randomUUID(), occurredAt: new Date().toISOString(), supportCode: 'MQ-TEST-001',
  flow: 'login', stage: 'session_request', screen: 'login', action: 'login_failed',
  severity: 'error', errorType: 'network_error', platform: 'web',
  message: 'Failed for test@example.com at https://example.com/path?token=123',
  breadcrumbs: [{ action: 'login_submitted', elapsedMs: 12, screen: 'Login' }],
});
const invoke = async (body, options = {}) => {
  const calls = [];
  const handler = createHandler(options.createRow || (async (...args) => calls.push(args)));
  const logs = [];
  const result = await handler({
    req: { method: options.method || 'POST', bodyJson: body, bodyText: JSON.stringify(body), headers: {} },
    res: { json: (value, status = 200) => ({ value, status }) },
    log: value => logs.push(value), error: value => logs.push(value),
  });
  return { result, calls, logs };
};

const valid = sample();
const accepted = await invoke(valid);
assert.equal(accepted.result.status, 201);
assert.equal(accepted.calls[0][0], valid.eventId);
assert.equal(accepted.calls[0][1].verifiedUserId, '');
assert.equal(accepted.calls[0][1].triageStatus, 'new');
assert.deepEqual(JSON.parse(accepted.calls[0][1].breadcrumbsJson), valid.breadcrumbs);
assert.ok(!JSON.stringify(accepted.calls).includes('test@example.com'));
assert.ok(!JSON.stringify(accepted.calls).includes('token=123'));
assert.ok(!JSON.stringify(accepted.logs).includes('test@example.com'));

for (const bad of [
  { ...sample(), action: 'unknown_action' },
  { ...sample(), eventId: 'not-a-uuid' },
  { ...sample(), breadcrumbs: Array.from({ length: 21 }, () => ({ action: 'login_opened', elapsedMs: 0 })) },
  { ...sample(), password: 'secret' },
  { ...sample(), breadcrumbs: [{ action: 'login_opened', elapsedMs: 0, token: 'secret' }] },
]) {
  assert.equal((await invoke(bad)).result.status, 400);
}
assert.equal((await invoke(sample(), { method: 'GET' })).result.status, 405);
assert.equal((await invoke({ ...sample(), message: 'x'.repeat(16500) })).result.status, 413);
assert.equal((await invoke(sample(), { createRow: async () => { throw Object.assign(new Error('conflict'), { statusCode: 409 }); } })).result.status, 200);
assert.equal((await invoke(sample(), { createRow: async () => { throw new Error('offline'); } })).result.status, 503);
assert.equal(validateIncident({ ...sample(), userId: 'claimed-user' }).row.verifiedUserId, '');
console.log('error-monitor function tests passed');
