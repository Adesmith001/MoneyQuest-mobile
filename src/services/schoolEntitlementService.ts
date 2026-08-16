import { functions } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';

const SCHOOL_ENTITLEMENTS_FUNCTION_ID = 'school-entitlements';

type ClaimResult = {
  ok: boolean;
  claimed: boolean;
  reason?: string;
  enrollment?: unknown;
};

async function execute(payload: Record<string, unknown>): Promise<any> {
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
      return await execute({ action: 'claim_email' });
    } catch (error) {
      console.error('School email claim failed:', error);
      return { ok: false, claimed: false, reason: 'request_failed' };
    }
  },

  async claimByCode(code: string): Promise<ClaimResult> {
    return execute({ action: 'claim_code', code });
  },

  async previewCode(code: string) {
    return execute({ action: 'preview_code', code });
  },
};

export default schoolEntitlementService;
