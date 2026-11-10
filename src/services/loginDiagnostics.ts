import { Platform } from 'react-native';
import { ExecutionMethod } from 'react-native-appwrite';
import { functions } from './appwrite';
import { getSupportCode } from '../utils/supportCode';

const FUNCTION_ID = 'login-diagnostics';

export type LoginStage =
  | 'started'
  | 'session_created'
  | 'account_read'
  | 'profile_read'
  | 'succeeded'
  | 'failed';

export function logLoginStage(
  attemptId: string,
  stage: LoginStage,
  startedAt: number,
  failure?: { authStage?: string; code?: unknown; type?: unknown },
): void {
  const payload = {
    attemptId,
    supportCode: getSupportCode(),
    stage,
    authStage: failure?.authStage || '',
    code: typeof failure?.code === 'number' || typeof failure?.code === 'string'
      ? String(failure.code).slice(0, 48) : '',
    type: typeof failure?.type === 'string' ? failure.type.slice(0, 64) : '',
    platform: Platform.OS,
    durationMs: Math.max(0, Date.now() - startedAt),
    occurredAt: new Date().toISOString(),
  };

  // Diagnostics must never change the result or timing of authentication.
  void functions.createExecution(
    FUNCTION_ID,
    JSON.stringify(payload),
    true,
    '/',
    ExecutionMethod.POST,
    { 'content-type': 'application/json' },
  ).catch(() => {});
}
