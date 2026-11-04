const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const publicIndex = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');

assert.equal(
  packageJson.dependencies['@react-navigation/stack'],
  '7.12.1',
  'React Native 0.88 requires the stack release that guards the removed InteractionManager API'
);
assert.equal(
  packageJson.dependencies['@react-navigation/native'],
  '7.5.1',
  'the stack compatibility release requires the matching navigation core'
);

assert.doesNotMatch(
  publicIndex,
  /serviceWorker\.register\(/,
  'the web shell must not install an asset-caching service worker'
);
assert.match(publicIndex, /getRegistrations\(\)/);
assert.match(publicIndex, /registration\.unregister\(\)/);
assert.match(publicIndex, /key\.startsWith\(['"]moneyquest-['"]\)/);

assert.doesNotMatch(
  serviceWorker,
  /addEventListener\(['"]fetch['"]/,
  'the retirement worker must never intercept image, font, or bundle requests'
);
assert.match(serviceWorker, /registration\.unregister\(\)/);

console.log('Release compatibility checks passed');
