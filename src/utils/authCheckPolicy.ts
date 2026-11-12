export const shouldApplyAuthCheck = (requestId: string, activeRequestId: string | null): boolean =>
  requestId === activeRequestId;

export const isMissingSessionError = (error: unknown): boolean => {
  const code = Number((error as { code?: number; status?: number })?.code ??
    (error as { status?: number })?.status);
  return code === 401 || code === 404;
};

export const getSessionCheckMessage = (error: unknown): string => {
  const failure = error as { type?: string; code?: number | string; message?: string } | null;
  const message = String(failure?.message || '');
  if (failure?.type === 'document_invalid_structure' ||
      failure?.type === 'profile_missing_identity' ||
      /profile unavailable/i.test(message)) {
    return 'Your profile could not be loaded. Sign out and log in again. If this continues, contact support.';
  }
  if (/timed out/i.test(message)) {
    return 'Session check timed out. Check your connection and retry.';
  }
  if (/failed to fetch|network request failed/i.test(message)) {
    return 'Could not reach the server. Check your connection and retry.';
  }
  return 'Could not verify your session. Retry or sign out and log in again.';
};
