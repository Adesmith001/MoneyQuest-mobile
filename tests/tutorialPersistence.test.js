const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setImmediate: settle } = require('node:timers/promises');
const { test } = require('node:test');
const ts = require('typescript');

function loadStore(storage) {
  const modules = new Map();

  function load(relativePath) {
    const filename = path.resolve(__dirname, '../src/store', relativePath);
    if (modules.has(filename)) return modules.get(filename);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    });
    const exports = {};
    const localRequire = (name) => {
      if (name === '@react-native-async-storage/async-storage') return storage;
      if (name === './slices/authSlice') {
        return (state = { user: null, isAuthenticated: false }, action) => {
          if (action.type === 'auth/signIn/fulfilled') {
            return { user: action.payload.userDocument, isAuthenticated: true };
          }
          if (action.type === 'auth/signOut/fulfilled' || action.type === 'auth/logout') {
            return { user: null, isAuthenticated: false };
          }
          return state;
        };
      }
      if (name.endsWith('Slice') && name !== './slices/tutorialSlice') {
        return (state = {}) => state;
      }
      if (name.startsWith('.')) {
        const dependency = path.resolve(path.dirname(filename), name + '.ts');
        return load(dependency);
      }
      return require(name);
    };
    new Function('exports', 'require', outputText)(exports, localRequire);
    modules.set(filename, exports);
    return exports;
  }

  const { store, persistor } = load('index.ts');
  return { store, persistor, actions: load('slices/tutorialSlice.ts') };
}

function memoryStorage(entries = []) {
  const values = new Map(entries);
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    mergeItem: async (key, value) => {
      const previous = JSON.parse(values.get(key) ?? '{}');
      values.set(key, JSON.stringify({ ...previous, ...JSON.parse(value) }));
    },
  };
}

const signIn = async (store, userId) => {
  store.dispatch({ type: 'auth/signIn/fulfilled', payload: { userDocument: { $id: userId } } });
  await settle();
};

test('tutorial completion survives sign-out, account switches, and a fresh store', async () => {
  const storage = memoryStorage();
  const { store, persistor, actions } = loadStore(storage);
  await settle();
  await signIn(store, 'student-a');
  store.dispatch(actions.completeAppTour());
  store.dispatch(actions.markHomeTourSeen());
  store.dispatch(actions.markQuestionGuideSeen());
  store.dispatch(actions.markStreakGuideSeen());
  store.dispatch(actions.markProfileGuideSeen());
  const completed = store.getState().tutorial;

  store.dispatch({ type: 'auth/signOut/fulfilled' });
  await signIn(store, 'student-b');
  assert.equal(store.getState().tutorial.hasCompletedAppTour, false);
  assert.equal(store.getState().tutorial.hasSeenHomeTour, false);
  await signIn(store, 'student-a');
  assert.deepEqual(store.getState().tutorial, completed);

  persistor.pause();
  const reopened = loadStore(storage);
  await settle();
  await signIn(reopened.store, 'student-a');
  assert.deepEqual(reopened.store.getState().tutorial, completed);

  reopened.store.dispatch(reopened.actions.resetGuide('hasCompletedAppTour'));
  assert.equal(reopened.store.getState().tutorial.hasCompletedAppTour, false);
  assert.equal(reopened.store.getState().tutorial.hasSeenHomeTour, true);
  reopened.store.dispatch(reopened.actions.completeAppTour());
  reopened.store.dispatch({ type: 'auth/logout' });
  await signIn(reopened.store, 'student-a');
  assert.equal(reopened.store.getState().tutorial.hasCompletedAppTour, true);
});

test('tutorial progress already in the app store migrates only to its saved account', async () => {
  const storage = memoryStorage([['persist:root', JSON.stringify({
    auth: JSON.stringify({ user: { $id: 'student-a' }, isAuthenticated: true }),
    tutorial: JSON.stringify({ hasCompletedAppTour: true, hasSeenProfileGuide: true }),
  })]]);
  const { store } = loadStore(storage);
  await settle();
  store.dispatch({ type: 'auth/logout' });
  await signIn(store, 'student-b');
  assert.equal(store.getState().tutorial.hasSeenProfileGuide, false);
  await signIn(store, 'student-a');
  assert.equal(store.getState().tutorial.hasCompletedAppTour, true);
  assert.equal(store.getState().tutorial.hasSeenProfileGuide, true);
});

test('tabs can complete different tutorials without overwriting each other', async () => {
  const storage = memoryStorage();
  const first = loadStore(storage);
  const second = loadStore(storage);
  await settle();
  await signIn(first.store, 'student-a');
  await signIn(second.store, 'student-a');
  first.store.dispatch(first.actions.completeAppTour());
  second.store.dispatch(second.actions.markHomeTourSeen());

  second.store.dispatch({ type: 'auth/logout' });
  await signIn(second.store, 'student-a');
  assert.equal(second.store.getState().tutorial.hasCompletedAppTour, true);
  assert.equal(second.store.getState().tutorial.hasSeenHomeTour, true);
});

test('a late tutorial read cannot replace the next account’s progress', async () => {
  const storage = memoryStorage();
  const getItem = storage.getItem;
  let resolveFirstAccount;
  storage.getItem = (key) => key.endsWith(':student-a')
    ? new Promise((resolve) => { resolveFirstAccount = resolve; })
    : getItem(key);
  const { store } = loadStore(storage);
  await settle();
  await signIn(store, 'student-a');
  await signIn(store, 'student-b');
  resolveFirstAccount(JSON.stringify({ hasCompletedAppTour: true }));
  await settle();
  assert.equal(store.getState().tutorial.accountId, 'student-b');
  assert.equal(store.getState().tutorial.hasCompletedAppTour, false);
});
