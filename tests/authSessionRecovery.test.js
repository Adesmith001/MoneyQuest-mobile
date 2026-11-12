const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/services/auth.ts'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

let session = { $id: 'anonymous-session', provider: 'anonymous' };
let accountInfo = { $id: 'anonymous-user', email: '', name: '' };
let deleted = 0;
let profileReads = 0;
let accountError = null;
let profileError = null;
const account = {
  getSession: async () => session,
  get: async () => { if (accountError) throw accountError; return accountInfo; },
  deleteSession: async () => { deleted++; },
};
const mocks = {
  './appwrite': { default: {}, account, databases: {}, storage: {}, DB_ID: 'db', COLLECTIONS: { USERS: 'users' }, STORAGE_BUCKET: 'bucket', Query: {} },
  'react-native-appwrite': { ID: { unique: () => 'id' }, OAuthProvider: {} },
  'react-native': { Platform: { OS: 'web' } },
  'expo-web-browser': {},
  'expo-linking': {},
  './backendApi': { backendApi: { clearAuthCache: () => {} } },
  './levelProgress': { levelProgressService: {} },
  '../utils': { getCurrentMonthKey: () => '', shouldResetMonthlyXP: () => false },
  './authProfile': {
    buildUserDocumentData: () => ({}),
    findOrCreateUserDocument: async () => {
      profileReads++;
      if (profileError) throw profileError;
      return { $id: accountInfo.$id, age: 12, xp: 0, level: 1 };
    },
  },
  './schoolEntitlementService': { claimByEmail: async () => {} },
  '../utils/passwordValidation': { getPasswordValidationError: () => null },
  '../utils/authCheckPolicy': { isMissingSessionError: error => error?.code === 401 || error?.code === 404 },
};
const moduleForTest = { exports: {} };
new Function('module', 'exports', 'require', javascript)(moduleForTest, moduleForTest.exports, name => {
  if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
  return mocks[name];
});
const auth = moduleForTest.exports.default;

(async () => {
  assert.equal(await auth.getCurrentUser(true), null, 'anonymous session goes to login');
  assert.equal(deleted, 1, 'anonymous session is ended');
  assert.equal(profileReads, 0, 'anonymous account never gets a student profile');

  session = { $id: 'email-session', provider: 'email' };
  accountInfo = { $id: 'student-a', email: 'student@example.test', name: 'Student A' };
  const user = await auth.getCurrentUser(true);
  assert.equal(user.$id, 'student-a', 'real email account is still restored');
  assert.equal(profileReads, 1, 'real account profile is loaded');
  assert.equal(deleted, 1, 'real session remains active');

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    accountError = Object.assign(new Error('account service unavailable'), { code: 503 });
    await assert.rejects(auth.getCurrentUser(true), error => error.authStage === 'account_read');
    accountError = null;
    profileError = Object.assign(new Error('profile service unavailable'), { code: 503 });
    await assert.rejects(auth.getCurrentUser(true), error => error.authStage === 'profile_read');
  } finally {
    console.error = originalConsoleError;
  }
  console.log('authSessionRecovery: passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
