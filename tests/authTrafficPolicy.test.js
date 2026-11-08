const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/store/slices/authSlice.ts'), 'utf8');
const authServiceSource = fs.readFileSync(path.join(__dirname, '../src/services/auth.ts'), 'utf8');
const backendApiSource = fs.readFileSync(path.join(__dirname, '../src/services/backendApi.ts'), 'utf8');
const signInStart = source.indexOf('export const signIn = createAsyncThunk(');
const signUpStart = source.indexOf('export const signUp = createAsyncThunk(');
const signOutStart = source.indexOf('export const signOut = createAsyncThunk(');
const signInThunk = source.slice(signInStart, signUpStart);
const signUpThunk = source.slice(signUpStart, signOutStart);

for (const [name, thunk] of [['signIn', signInThunk], ['signUp', signUpThunk]]) {
  assert.match(thunk, /const \{ currentUser, userDocument \} = await AuthService\.signIn/);
  assert.doesNotMatch(thunk, /AuthService\.getCurrentUser\(/, `${name} must reuse sign-in data`);
  assert.doesNotMatch(thunk, /AuthService\.getUserDocument\(/, `${name} must reuse the hydrated profile`);
}

assert.match(backendApiSource, /clearAuthCache\(\)/, 'backend API exposes JWT invalidation');
assert.match(authServiceSource, /backendApi\.clearAuthCache\(\)/, 'sign-out invalidates the cached JWT');
assert.ok(
  (authServiceSource.match(/backendApi\.clearAuthCache\(\)/g) || []).length >= 4,
  'all direct session-clearing paths invalidate the cached JWT',
);

console.log('authTrafficPolicy: passed');
