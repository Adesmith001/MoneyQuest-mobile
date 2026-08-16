export const LEGACY_COMPLETED_LEVELS_KEY = '@moneyquest_completed_levels';

export const getCompletedLevelsStorageKey = (userId: string): string =>
  `${LEGACY_COMPLETED_LEVELS_KEY}:${userId}`;

type ActionLike = {
  type?: string;
  payload?: any;
};

const AUTHENTICATED_ACTION_TYPES = new Set([
  'auth/signIn/fulfilled',
  'auth/signUp/fulfilled',
  'auth/signUpWithOnboarding/fulfilled',
  'auth/handleOAuthCallback/fulfilled',
  'auth/completeOAuthOnboarding/fulfilled',
  'auth/getCurrentUser/fulfilled',
  'auth/checkAuthStatus/fulfilled',
  'auth/reactivateAccount/fulfilled',
]);

export const getAuthenticatedActionUserId = (
  action: ActionLike
): string | null => {
  if (!action.type || !AUTHENTICATED_ACTION_TYPES.has(action.type)) {
    return null;
  }

  const payload = action.payload;
  if (!payload) {
    return null;
  }

  return (
    payload.userDocument?.$id ??
    payload.user?.$id ??
    payload.$id ??
    null
  );
};

export const shouldResetUserScopedState = (
  previousUserId: string | null | undefined,
  nextUserId: string | null | undefined
): boolean => Boolean(nextUserId && previousUserId !== nextUserId);
