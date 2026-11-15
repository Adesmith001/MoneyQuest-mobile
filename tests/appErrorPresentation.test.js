const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const readSource = file => readFileSync(join(__dirname, '..', file), 'utf8');
for (const file of [
  'auth/LoginScreen',
  'auth/RegisterScreen',
  'auth/ForgotPasswordScreen',
  'auth/ProfileSetupScreen',
  'onboarding/AvatarSelectionScreen',
  'common/SchoolCodeEntryScreen',
  'common/PremiumScreen',
  'common/PaymentPendingScreen',
  'main/HomeScreen',
]) {
  assert.ok(readSource('src/screens/' + file + '.tsx').includes('<ErrorNotice'),
    file + ' uses the shared error notice');
}
assert.ok(readSource('src/navigation/AppNavigator.tsx').includes('<ErrorNotice'), 'Session recovery uses the shared error notice');
assert.ok(readSource('App.tsx').includes('<ErrorAlertHost'), 'The app can show imperative error alerts');
console.log('App error presentation checks passed');
