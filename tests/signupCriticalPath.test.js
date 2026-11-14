const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/services/auth.ts'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

let deletedSessions = 0;
let claimed = 0;
let initializedLessons = 0;
let profileFailure = false;
let sessionError = null;
let getSessionCalls = 0;
let sessionCreates = 0;
let accountGetCalls = 0;
let profileCalls = 0;
const account = {
  create: async () => ({ $id: 'student-a' }),
  createEmailPasswordSession: async () => { sessionCreates++; return { $id: 'session-a' }; },
  get: async () => { accountGetCalls++; return { $id: 'student-a', email: 'student@example.test', name: 'Student A' }; },
  getSession: async () => { getSessionCalls++; if (sessionError) throw sessionError; return { $id: 'session-a' }; },
  deleteSession: async () => { deletedSessions++; },
};
function loadAuthFailure() {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/authFailure.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, () => ({ getSupportCode: () => 'MQ-TEST' }));
  return exports;
}
const pending = new Promise(() => {});
const mocks = {
  './appwrite': { default: {}, account, databases: {}, storage: {}, DB_ID: 'db', COLLECTIONS: { USERS: 'users' }, STORAGE_BUCKET: 'bucket', Query: {} },
  'react-native-appwrite': { ID: { unique: () => 'id' }, OAuthProvider: {} },
  'react-native': { Platform: { OS: 'web' } },
  'expo-web-browser': {},
  'expo-linking': {},
  './backendApi': { backendApi: {
    getSections: () => { initializedLessons++; return pending; },
    clearAuthCache: () => {},
  } },
  './levelProgress': { levelProgressService: {} },
  '../utils': { getCurrentMonthKey: () => '', shouldResetMonthlyXP: () => false },
  './authFailure': loadAuthFailure(),
  './authProfile': {
    buildUserDocumentData: (_account, seed) => seed,
    findOrCreateUserDocument: async () => {
      profileCalls++;
      if (profileFailure) throw new Error('Profile store unavailable');
      return { $id: 'student-a', name: 'Student A', avatar: 'avatar1', age: 12, learningLimit: 'casual', mainGoal: 'save' };
    },
  },
  './schoolEntitlementService': { claimByEmail: () => { claimed++; return pending; } },
  '../utils/passwordValidation': { getPasswordValidationError: () => null },
  '../utils/authCheckPolicy': { isMissingSessionError: error => error?.code === 401 || error?.code === 404 },
  '../utils/webSessionMarker': { getDefaultWebSessionMarkerStore: () => ({}), isWebSessionMarked: () => true, markWebSession: () => {}, clearWebSessionMarker: () => {} },
};
let activeOwner = 'student-a';
global.window = { localStorage: {
  getItem: () => activeOwner,
  setItem: (_key, value) => { activeOwner = value; },
  removeItem: key => { if (key === 'moneyquest_active_user_id') activeOwner = null; },
} };
const moduleForTest = { exports: {} };
new Function('module', 'exports', 'require', javascript)(moduleForTest, moduleForTest.exports, name => {
  if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
  return mocks[name];
});
const auth = moduleForTest.exports.default;
const registration = {
  email: 'student@example.test', password: 'password123', name: 'Student A',
  age: 12, learningLimit: 'casual', mainGoal: 'save', referralSource: 'school', avatar: 'avatar1',
};

(async () => {
  const result = await Promise.race([
    auth.createAccountWithOnboarding(registration),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Signup waited for optional services')), 200)),
  ]);
  assert.equal(result.userDocument.$id, 'student-a');
  assert.equal(claimed, 1);
  assert.equal(initializedLessons, 0);
  assert.equal(deletedSessions, 0);

  getSessionCalls = 0;
  sessionCreates = 0;
  accountGetCalls = 0;
  profileCalls = 0;
  const signedIn = await auth.signIn('student@example.test', 'password123');
  assert.equal(signedIn.currentUser.$id, 'student-a');
  assert.equal(signedIn.userDocument.$id, 'student-a');
  assert.equal(sessionCreates, 1, 'sign-in creates exactly one session');
  assert.equal(getSessionCalls, 0, 'sign-in avoids an unnecessary preliminary session check');
  assert.equal(accountGetCalls, 1, 'sign-in reads the Appwrite account once');
  assert.equal(profileCalls, 1, 'sign-in hydrates the profile once');
  deletedSessions = 0;

  profileFailure = true;
  await assert.rejects(auth.createAccountWithOnboarding(registration), error => error.kind === 'setup_interrupted');
  assert.equal(deletedSessions, 1, 'clean up only the interrupted attempt session');
  profileFailure = false;
  assert.equal((await auth.signIn(registration.email, registration.password)).currentUser.$id, 'student-a');
  profileCalls = 0;
  assert.equal((await auth.restoreSession()).userDocument.$id, 'student-a');
  assert.equal(profileCalls, 1, 'restore hydrates the profile once');
  deletedSessions = 0;

  sessionError = { code: 503 };
  await assert.rejects(auth.getCurrentUser(true), error => error.kind === "unavailable");
  sessionError = { code: 401 };
  assert.equal(await auth.getCurrentUser(true), null, 'expired session is distinct from outage');
  activeOwner = 'student-b';
  await auth.signOut('student-a');
  assert.equal(deletedSessions, 0, 'old tab cannot delete the new student session');
  assert.equal(activeOwner, 'student-b');
  activeOwner = 'student-a';
  await auth.signOut('student-a');
  assert.equal(deletedSessions, 1, 'explicit owner sign-out deletes its server session');
  assert.equal(activeOwner, '');
  console.log('signupCriticalPath: passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
