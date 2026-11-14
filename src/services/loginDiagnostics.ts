import Constants from 'expo-constants';
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

export function createLoginTrace() {
  const startedAt = Date.now();
  const attemptId = `${startedAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const timeline: TimelineEntry[] = [];
  const base = {
    attemptId,
    supportCode: getSupportCode(),
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version || "unknown",
  };

  const step = (name: LoginStep) => {
    timeline.push({ step: name, elapsedMs: Date.now() - startedAt });
  };

  step('submit');

  return {
    attemptId,
    step,
    finish(outcome: 'succeeded' | 'failed', failure?: {
      stage?: string; kind?: string; status?: number;
    }) {
      if (outcome === "succeeded" && Math.random() >= 0.05) return;
      send({
        ...base,
        kind: 'finished',
        outcome,
        timeline,
        durationMs: Date.now() - startedAt,
        authStage: failure?.stage || '',
        code: String(failure?.status ?? ''),
        type: failure?.kind || '',
        occurredAt: new Date().toISOString(),
      });
    },
  };
}
