const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/services/authFailure.ts'), 'utf8');
const exportsObject = {};
new Function('exports', 'require', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(exportsObject, () => ({ getSupportCode: () => 'MQ-TEST' }));

const { authFailure, authDeadline } = exportsObject;
const now = 100000;
assert.deepEqual(authFailure({ code: 429, retryAfter: '12' }, 'session_create', now), {
  kind: 'rate_limited', stage: 'session_create', status: 429, retryAt: 112000, supportCode: 'MQ-TEST',
});
assert.equal(authFailure({ status: 429, rateLimitReset: '250' }, 'profile_read', now).retryAt, 250000);
assert.equal(authFailure({ status: 429 }, 'profile_read', now).retryAt, 400000);
assert.equal(authFailure({ code: 401 }, 'session_create').kind, 'credentials');
assert.equal(authFailure({ code: 401 }, 'session_read').kind, 'expired');
assert.equal(authFailure(new Error('Network request failed'), 'account_read').kind, 'offline');
assert.equal(authFailure({ code: 503 }, 'profile_read').kind, 'unavailable');

(async () => {
  const deadline = authDeadline(10);
  await assert.rejects(deadline.run(() => new Promise(() => {}), 'account_read'),
    error => error.kind === 'timeout' && error.stage === 'account_read');
  let called = false;
  await assert.rejects(deadline.run(() => { called = true; }, 'profile_read'),
    error => error.kind === 'timeout');
  assert.equal(called, false);
  console.log('authFailure: passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
