const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/screens/common/PremiumScreen.tsx'),
  'utf8',
);

assert.match(source, /import \{[^}]*signOut[^}]*\} from "\.\.\/\.\.\/store\/slices\/authSlice";/s);
assert.match(source, /await dispatch\(signOut\(\)\)\.unwrap\(\)/);
assert.match(source, /Sign out to use another account/);
assert.match(source, /accessibilityRole="button"/);
assert.match(source, /isLoggingOut/);

console.log('premiumSignOut: passed');
