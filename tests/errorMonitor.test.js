import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const source = fs.readFileSync('src/services/errorMonitorCore.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, Date, Promise, JSON, String, Number, Error, Array, Math, Object });
const { IncidentReporter, redactDiagnostic } = exports;

let clock = 1000000;
let stored = null;
let sends = [];
let fail = false;
const storage = { getItem: async () => stored, setItem: async (_, value) => { stored = value; } };
let serial = 0;
const makeReporter = () => new IncidentReporter({
  storage, now: () => clock, uuid: () => `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`,
  identity: () => ({ supportCode: 'MQ-TEST-1', releaseId: 'test', platform: 'web', deviceClass: 'web', screen: 'Login' }),
  send: async item => { if (fail) throw Error('offline'); sends.push(item); },
});
const context = { flow: 'login', stage: 'session_request', action: 'login_failed', severity: 'error' };

(async () => {
  const reporter = makeReporter();
  for (let i = 0; i < 25; i++) { clock += 10; reporter.recordBreadcrumb('login_submitted', 'Login'); }
  assert.equal(reporter.getBreadcrumbs().length, 20);
  assert.equal(reporter.getBreadcrumbs()[0].elapsedMs, 60);
  assert.equal(reporter.getBreadcrumbs()[19].elapsedMs, 250);
  assert.equal(reporter.getBreadcrumbs()[19].screen, 'Login');
  assert.equal(redactDiagnostic('test@example.com https://a.test?q=1 Authorization: Bearer abc password=secret'),
    '[email] [url] [credential] [credential]');

  fail = true;
  await reporter.capture(new Error('test@example.com failed at https://a.test?q=1'), context);
  assert.equal(sends.length, 0);
  assert.equal(JSON.parse(stored).length, 1);
  assert.ok(!stored.includes('test@example.com'));
  assert.ok(!stored.includes('q=1'));
  fail = false;
  await reporter.flush();
  assert.equal(sends.length, 1);
  assert.equal(sends[0].eventId, '00000000-0000-4000-8000-000000000001');
  assert.equal(JSON.parse(stored).length, 0);

  fail = true;
  for (let i = 0; i < 25; i++) { clock += 1100; await reporter.capture(new Error(`failure ${i}`), context); }
  assert.equal(JSON.parse(stored).length, 20);
  clock += 24 * 60 * 60 * 1000 + 1;
  const resumed = makeReporter();
  fail = false;
  await resumed.flush();
  assert.equal(sends.length, 1);
  assert.equal(JSON.parse(stored).length, 0);
  console.log('error-monitor client tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
