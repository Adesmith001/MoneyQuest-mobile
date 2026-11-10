import { Platform } from 'react-native';
import { ExecutionMethod } from 'react-native-appwrite';
import { functions } from './appwrite';
import { getSupportCode } from '../utils/supportCode';

const FUNCTION_ID = 'login-diagnostics';

export type LoginStep =
  | 'submit'
  | 'session_request_sent'
  | 'session_created'
  | 'account_request_sent'
  | 'account_read'
  | 'profile_request_sent'
  | 'profile_read'
  | 'session_cleanup_started'
  | 'session_cleanup_finished';

type TimelineEntry = { step: LoginStep; elapsedMs: number };

function send(payload: Record<string, unknown>): void {
  // A diagnostics outage must never interrupt the sign-in flow.
  try {
    void functions.createExecution(
      FUNCTION_ID,
      JSON.stringify(payload),
      true,
      '/',
      ExecutionMethod.POST,
      { 'content-type': 'application/json' },
    ).catch(() => {});
  } catch {
    // The SDK can also fail before it returns a promise.
  }
}

export function createLoginTrace(email: string, passwordProvided: boolean) {
  const startedAt = Date.now();
  const attemptId = `${startedAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const timeline: TimelineEntry[] = [];
  const base = {
    attemptId,
    supportCode: getSupportCode(),
    platform: Platform.OS,
    emailSubmitted: email.trim(),
    emailHadOuterWhitespace: email !== email.trim(),
    passwordProvided,
  };

  const step = (name: LoginStep) => {
    timeline.push({ step: name, elapsedMs: Date.now() - startedAt });
  };

  step('submit');
  send({ ...base, kind: 'started', occurredAt: new Date().toISOString() });

  return {
    attemptId,
    step,
    finish(outcome: 'succeeded' | 'failed', failure?: {
      authStage?: string; code?: unknown; type?: unknown;
    }) {
      send({
        ...base,
        kind: 'finished',
        outcome,
        timeline,
        durationMs: Date.now() - startedAt,
        authStage: failure?.authStage || '',
        code: typeof failure?.code === 'number' || typeof failure?.code === 'string'
          ? String(failure.code).slice(0, 48) : '',
        type: typeof failure?.type === 'string' ? failure.type.slice(0, 64) : '',
        occurredAt: new Date().toISOString(),
      });
    },
  };
}
