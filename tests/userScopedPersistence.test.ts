import {
  getAuthenticatedActionUserId,
  getCompletedLevelsStorageKey,
  shouldResetUserScopedState,
} from '../src/utils/userScopedPersistence';

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

assertEqual(
  getCompletedLevelsStorageKey('user-a'),
  '@moneyquest_completed_levels:user-a',
  'completed level cache keys are scoped to the active user'
);

assertEqual(
  shouldResetUserScopedState('user-a', 'user-b'),
  true,
  'switching authenticated accounts resets user-scoped state'
);

assertEqual(
  shouldResetUserScopedState(null, 'user-a'),
  true,
  'first accepted account resets stale anonymous device-scoped state'
);

assertEqual(
  shouldResetUserScopedState('user-a', 'user-a'),
  false,
  'restoring the same authenticated account keeps user-scoped state'
);

assertEqual(
  getAuthenticatedActionUserId({
    type: 'auth/signIn/fulfilled',
    payload: { userDocument: { $id: 'user-a' } },
  }),
  'user-a',
  'extracts account id from email sign-in payloads'
);

assertEqual(
  getAuthenticatedActionUserId({
    type: 'auth/handleOAuthCallback/fulfilled',
    payload: { $id: 'oauth-user' },
  }),
  'oauth-user',
  'extracts account id from OAuth callback payloads'
);
