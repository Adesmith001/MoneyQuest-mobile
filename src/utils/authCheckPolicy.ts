export const shouldApplyAuthCheck = (requestId: string, activeRequestId: string | null): boolean =>
  requestId === activeRequestId;

export const isMissingSessionError = (error: unknown): boolean => {
  const code = Number((error as { code?: number; status?: number })?.code ??
    (error as { status?: number })?.status);
  return code === 401 || code === 404;
};
