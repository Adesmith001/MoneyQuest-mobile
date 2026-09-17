const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const extra = require('../app.json').expo.extra;
const source = fs.readFileSync(require.resolve('../src/config/environment.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function load(env, config = extra) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => {
    if (name === '@env') return env;
    if (name === 'expo-constants') return { __esModule: true, default: { expoConfig: { extra: config } } };
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports.ENV;
}
const cleanBuild = load({});
for (const key of ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_DATABASE_ID']) {
  assert.equal(cleanBuild[key], extra[key], `${key} must survive an EAS build without local .env`);
  assert.equal(load({ [key]: 'override' })[key], 'override', 'build environment takes precedence');
}
assert.equal(load({}, undefined).REVENUECAT_IOS_KEY, '', 'never invent billing credentials');
console.log('Build environment checks passed');
