const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/authCheckPolicy.ts'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleForTest = { exports: {} };
new Function('module', 'exports', javascript)(moduleForTest, moduleForTest.exports);
const { shouldApplyAuthCheck, isMissingSessionError, getSessionCheckMessage } = moduleForTest.exports;

assert.equal(shouldApplyAuthCheck('check-1', 'check-1'), true);
assert.equal(shouldApplyAuthCheck('check-1', null), false, 'new login supersedes old check');
assert.equal(shouldApplyAuthCheck('check-1', 'check-2'), false, 'newer check wins');
assert.equal(isMissingSessionError({ code: 401 }), true);
assert.equal(isMissingSessionError({ code: 404 }), true);
assert.equal(isMissingSessionError({ code: 503 }), false, 'outage is not logout');
assert.equal(isMissingSessionError(new Error('Network request failed')), false);
assert.match(getSessionCheckMessage({ type: 'document_invalid_structure', code: 400 }), /profile/i);
assert.match(getSessionCheckMessage(new Error('Session check timed out. Please retry.')), /timed out/i);
assert.match(getSessionCheckMessage(new TypeError('Failed to fetch')), /connection/i);
console.log('authCheckPolicy: passed');
