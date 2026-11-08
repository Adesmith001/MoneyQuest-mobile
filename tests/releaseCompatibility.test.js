const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const publicIndex = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');
const homeScreen = fs.readFileSync(path.join(root, 'src', 'screens', 'main', 'HomeScreen.tsx'), 'utf8');
const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

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

assert.doesNotMatch(
  homeScreen,
  /await checkForNewSectionsAvailability\(\)/,
  'content-version compatibility checks must never block cached startup content'
);
assert.ok(
  homeScreen.indexOf('cachedBackendApi.getSections()') <
    homeScreen.indexOf('void checkForNewSectionsAvailability()'),
  'the home screen renders cached learning data before checking versions in the background'
);
assert.match(
  homeScreen,
  /await cachedBackendApi\.forceRefreshLearningPath\(\);/,
  'a changed backend content version refreshes persisted learning data automatically'
);
assert.doesNotMatch(
  homeScreen,
  /\}, \[activeSectionIndex, checkForNewSectionsAvailability,/,
  'viewing another section must not reload the learning path'
);
assert.match(
  homeScreen,
  /if \(!hasInitiallyLoadedRef\.current && sectionsData\.length > 0\) \{\s+setSections\(\[\.\.\.sectionsData\]\);/,
  'background refreshes must retain the complete visible section list until replacement data is ready'
);
assert.ok(
  vercelConfig.headers.some(
    (rule) => rule.source === '/' &&
      rule.headers.some((header) => header.key === 'Cache-Control' && header.value.includes('no-cache'))
  ),
  'the deployed web shell must not be cached at the root URL'
);

console.log('Release compatibility checks passed');
