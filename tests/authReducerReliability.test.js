const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const toolkit = require('@reduxjs/toolkit');

const source = fs.readFileSync(path.join(__dirname, '../src/store/slices/authSlice.ts'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const mocks = {
  '@reduxjs/toolkit': toolkit,
  '../../services/auth': { default: {} },
  '../../services/googleAuth': { default: {} },
  './streakSlice': { updateStreakOnLogin: () => ({ type: 'streak/update' }), resetStreakState: () => ({ type: 'streak/reset' }) },
  '@react-native-async-storage/async-storage': { default: {} },
  '../../services/revenueCatService': { default: {} },
  '../../services/analytics': { default: {} },
  '../../services/schoolEntitlementService': { default: {} },
  '../../utils/authCheckPolicy': { shouldApplyAuthCheck: (id, active) => id === active },
  '../../utils/supportCode': { getSupportCode: () => 'test' },
  '../../services/loginDiagnostics': { createLoginTrace: () => ({ step: () => {}, finish: () => {}, attemptId: 'test' }) },
  '../../services/errorMonitor': { recordBreadcrumb: () => {}, captureIncident: async () => {} },
  '../../utils/webSessionMarker': { getDefaultWebSessionMarkerStore: () => null, isWebSessionMarked: () => false },
};
const moduleForTest = { exports: {} };
new Function('module', 'exports', 'require', javascript)(moduleForTest, moduleForTest.exports, name => {
  if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
  return mocks[name];
});
const { default: reducer, checkAuthStatus, signUpWithOnboarding } = moduleForTest.exports;

const student = { $id: 'student-a', name: 'Student A' };
let state = reducer(undefined, { type: 'init' });
state = reducer(state, checkAuthStatus.pending('old-check', undefined));
state = reducer(state, signUpWithOnboarding.pending('signup', {}));
assert.equal(state.isCheckingSession, false, 'signup keeps its form visible while the request runs');
state = reducer(state, signUpWithOnboarding.fulfilled({ userDocument: student }, 'signup', {}));
state = reducer(state, checkAuthStatus.fulfilled(null, 'old-check', undefined));
assert.equal(state.user.$id, 'student-a', 'stale session check cannot erase successful signup');
assert.equal(state.isAuthenticated, true);
assert.equal(state.showWelcomeScreen, true);

state = reducer(state, checkAuthStatus.pending('network-check', undefined));
state = reducer(state, checkAuthStatus.rejected(null, 'network-check', undefined, 'network')); 
assert.equal(state.user.$id, 'student-a', 'network error preserves the current account');
assert.match(state.sessionCheckError, /network/);
assert.equal(state.isLoading, false);
assert.equal(state.isCheckingSession, false);
console.log('authReducerReliability: passed');
