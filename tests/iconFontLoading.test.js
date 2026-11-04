const assert = require('assert');
const fs = require('fs');

const appSource = fs.readFileSync('App.tsx', 'utf8');

assert.match(
  appSource,
  /import\s*\{[^}]*\bIonicons\b[^}]*\}\s*from\s*['"]@expo\/vector-icons['"]/
);
assert.match(
  appSource,
  /Font\.loadAsync\(\{[\s\S]*\.\.\.Ionicons\.font/
);

console.log('iconFontLoading: passed');
