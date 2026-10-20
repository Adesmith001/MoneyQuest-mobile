import {
  WEB_SESSION_MARKER_KEY,
  WebSessionMarkerStore,
  isWebSessionMarked,
  markWebSession,
  clearWebSessionMarker,
} from '../src/utils/webSessionMarker';

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const createFakeStore = (): WebSessionMarkerStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
};

// New visit: no marker -> session must not be restored.
const freshStore = createFakeStore();
assertEqual(
  isWebSessionMarked(freshStore),
  false,
  'a fresh visit has no session marker, so no previous session is restored'
);

// After sign-in the tab owns the session.
markWebSession(freshStore);
assertEqual(
  isWebSessionMarked(freshStore),
  true,
  'signing in marks the tab as the session owner'
);
assertEqual(
  freshStore.data.get(WEB_SESSION_MARKER_KEY),
  '1',
  'the marker is written under the expected storage key'
);

// Refreshing the same tab still reads the marker (sessionStorage survives reloads).
assertEqual(
  isWebSessionMarked(freshStore),
  true,
  'refreshing the same tab keeps the session marker'
);

// Signing out clears the marker so the next student starts logged out.
clearWebSessionMarker(freshStore);
assertEqual(
  isWebSessionMarked(freshStore),
  false,
  'signing out clears the marker so the next student starts logged out'
);
assertEqual(
  freshStore.data.has(WEB_SESSION_MARKER_KEY),
  false,
  'the marker key is removed from storage after sign-out'
);

// A marker belonging to a different tab must never leak (sessionStorage is per-tab).
const otherTabStore = createFakeStore();
markWebSession(freshStore);
assertEqual(
  isWebSessionMarked(otherTabStore),
  false,
  'a new tab cannot see another tab session marker'
);

// No storage available (native runtime) -> everything is a safe no-op.
assertEqual(isWebSessionMarked(null), false, 'missing store reads as not marked');
assertEqual(isWebSessionMarked(undefined), false, 'undefined store reads as not marked');
markWebSession(null);
clearWebSessionMarker(null);
markWebSession(undefined);
clearWebSessionMarker(undefined);

// A store whose methods throw must not crash the helpers.
const throwingStore: WebSessionMarkerStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};
assertEqual(
  isWebSessionMarked(throwingStore),
  false,
  'a throwing store reads as not marked instead of crashing'
);
markWebSession(throwingStore);
clearWebSessionMarker(throwingStore);

console.log('webSharedDeviceSession.test.ts: all assertions passed');
