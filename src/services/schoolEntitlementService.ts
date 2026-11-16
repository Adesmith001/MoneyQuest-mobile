import { functions } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import type { CodeValidationResult, School, SchoolCode } from '../types/school';

const SCHOOL_ENTITLEMENTS_FUNCTION_ID = 'school-entitlements';

type ClaimResult = {
  ok: boolean;
  claimed: boolean;
  reason?: string;
  enrollment?: unknown;
};

type PreviewResult = {
  ok: boolean;
  code?: SchoolCode;
  school?: School;
  message?: string;
};

async function execute<Result>(payload: Record<string, unknown>): Promise<Result> {
  const execution = await functions.createExecution(
    SCHOOL_ENTITLEMENTS_FUNCTION_ID,
    JSON.stringify(payload),
    false,
    '/',
    ExecutionMethod.POST,
    { 'content-type': 'application/json' },
  );

  return JSON.parse(execution.responseBody || '{}');
}

export const schoolEntitlementService = {
  async claimByEmail(): Promise<ClaimResult> {
    try {
      return await execute<ClaimResult>({ action: 'claim_email' });
    } catch (error) {
      console.error('School email claim failed:', error);
      return { ok: false, claimed: false, reason: 'request_failed' };
    }
  },

  async claimByCode(code: string): Promise<ClaimResult> {
    return execute<ClaimResult>({ action: 'claim_code', code });
  },

  async previewCode(code: string): Promise<CodeValidationResult> {
    const result = await execute<PreviewResult>({ action: 'preview_code', code });
    return {
      isValid: result.ok,
      code: result.code,
      school: result.school,
      errorMessage: result.message,
    };
  },
};

export default schoolEntitlementService;
