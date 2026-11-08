const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/errorDiagnostics.ts'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleForTest = { exports: {} };
new Function('module', 'exports', javascript)(moduleForTest, moduleForTest.exports);

const { buildErrorDiagnostics, sanitizeDiagnosticText } = moduleForTest.exports;
const sensitive = 'student@example.com failed at https://example.test/private Authorization: Bearer secret-token';
const sanitized = sanitizeDiagnosticText(sensitive);
assert.doesNotMatch(sanitized, /student@example\.com|example\.test|secret-token/);

const details = buildErrorDiagnostics(
  new Error(sensitive),
  'at StudentProfile (student@example.com)',
  '1.1.2',
);
assert.equal(details.release_id, '1.1.2');
assert.match(details.error_message, /\[redacted-email\]/);
assert.match(details.error_stack, /\[redacted-url\]/);
assert.match(details.component_stack, /\[redacted-email\]/);

console.log('errorDiagnostics: passed');
