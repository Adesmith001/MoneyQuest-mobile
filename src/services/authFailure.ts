import { getSupportCode } from '../utils/supportCode';

export type AuthFailureKind =
  | 'credentials' | 'rate_limited' | 'offline' | 'unavailable' | 'timeout'
  | 'setup_interrupted' | 'expired' | 'disabled' | 'active_session'
  | 'in_progress' | 'validation' | 'unknown';

export type AuthFailure = {
  kind: AuthFailureKind;
  stage: string;
  retryAt?: number;
  supportCode: string;
  accountId?: string;
  status?: number;
};

const failureKinds = new Set<string>([
  'credentials', 'rate_limited', 'offline', 'unavailable', 'timeout',
  'setup_interrupted', 'expired', 'disabled', 'active_session', 'in_progress',
  'validation', 'unknown',
]);

export function authFailure(error: unknown, stage: string, now = Date.now()): AuthFailure {
  const raw = error as {
    kind?: AuthFailureKind; supportCode?: string; code?: number | string; status?: number;
    authStage?: string; type?: string; message?: string; retryAfter?: string;
    rateLimitReset?: string; headers?: { get(name: string): string | null };
  } | null;
  if (raw?.kind && failureKinds.has(raw.kind) && raw.supportCode) return raw as AuthFailure;
  stage = raw?.authStage || stage;
  const status = Number(raw?.status ?? raw?.code);
  const message = raw?.message ?? '';
  const base = { stage, supportCode: getSupportCode(), ...(Number.isInteger(status) && status > 0 ? { status } : {}) };
  if (status === 429) {
    const retry = raw?.headers?.get('Retry-After') || raw?.retryAfter;
    const reset = raw?.headers?.get('X-RateLimit-Reset') || raw?.rateLimitReset;
    const retryAt = retry && /^\d+$/.test(retry) ? now + Number(retry) * 1000
      : retry ? Date.parse(retry) : 0;
    const resetAt = reset && /^\d+$/.test(reset) ? Number(reset) * 1000 : 0;
    return { ...base, kind: 'rate_limited', retryAt: [retryAt, resetAt].find(time => time > now) ?? now + 300000 };
  }
  if (message.startsWith('ACCOUNT_DISABLED:')) {
    return { ...base, kind: 'disabled', accountId: message.split(':')[1] };
  }
  if (raw?.type === 'user_session_already_exists') return { ...base, kind: 'active_session' };
  if (raw?.code === 'auth_in_progress') return { ...base, kind: 'in_progress' };
  if (raw?.code === 'timeout') return { ...base, kind: 'timeout' };
  if (status === 401 && stage === 'session_create') return { ...base, kind: 'credentials' };
  if ((status === 401 || status === 404) && ['session_read', 'recovery_complete'].includes(stage)) {
    return { ...base, kind: 'expired' };
  }
  if (status >= 500) return { ...base, kind: 'unavailable' };
  if (/failed to fetch|network request failed|network error|offline|load failed/i.test(message)) {
    return { ...base, kind: 'offline' };
  }
  if (status === 400 || status === 409) return { ...base, kind: 'validation' };
  return { ...base, kind: 'unknown' };
}

export function authFailureMessage(failure: AuthFailure): string {
  switch (failure.kind) {
    case 'credentials': return 'Email or password is incorrect.';
    case 'rate_limited': return 'Too many attempts. Wait for the countdown before trying again.';
    case 'offline': return 'We could not connect. Check your internet connection and try again.';
    case 'unavailable': return 'The service is temporarily unavailable. Try again shortly.';
    case 'timeout': return 'This is taking longer than expected. Check your connection and try again.';
    case 'setup_interrupted': return 'Your account was created. Sign in to finish setup.';
    case 'expired': return failure.stage === 'recovery_complete'
      ? 'This reset link has expired. Request a new one.'
      : 'Your session expired. Sign in again.';
    case 'disabled': return 'Your account is disabled. Reactivate it to continue.';
    case 'active_session': return 'An account is already signed in. Continue with that account or sign out first.';
    case 'in_progress': return 'Your previous request is still being checked. Wait a moment and try again.';
    case 'validation': return 'Check the information you entered and try again.';
    default: return 'We could not complete this request. Try again, or contact support if it continues.';
  }
}

export function authDeadline(durationMs: number) {
  const expires = Date.now() + durationMs;
  return {
    async run<T>(start: () => T | Promise<T>, stage: string): Promise<T> {
      const timeLeft = expires - Date.now();
      const timeout = () => authFailure({ code: 'timeout' }, stage);
      if (timeLeft <= 0) throw timeout();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          start(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(timeout()), timeLeft);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}

export async function authRequest<T>(
  deadline: ReturnType<typeof authDeadline>, start: () => Promise<T>, stage: string,
): Promise<T> {
  try {
    return await deadline.run(start, stage);
  } catch (error) {
    throw authFailure(error, stage);
  }
}
