const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const authSlice = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'store', 'slices', 'authSlice.ts'),
  'utf8'
);

const checkAuthStatusStart = authSlice.indexOf("export const checkAuthStatus = createAsyncThunk(");
const refreshUserDataStart = authSlice.indexOf("export const refreshUserData = createAsyncThunk(");
const checkAuthStatusSource = authSlice.slice(checkAuthStatusStart, refreshUserDataStart);

assert.notEqual(checkAuthStatusStart, -1, 'checkAuthStatus thunk should exist');
assert.notEqual(refreshUserDataStart, -1, 'checkAuthStatus should end before refreshUserData');
assert.equal(
  checkAuthStatusSource.includes('if (Platform.OS === \'web\')'),
  false,
  'startup auth checks must not sign out a session created while the check was in flight'
);

console.log('authCheckRace.test.js: all assertions passed');
