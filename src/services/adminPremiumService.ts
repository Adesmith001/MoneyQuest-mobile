import { ExecutionMethod } from 'react-native-appwrite';
import { functions } from './appwrite';
import { ENV } from '../config/environment';
import analyticsService from './analytics';
import { User } from '../types';

export type ManualGrantAction = 'preview' | 'grant';
export type ManualGrantResolution = 'create' | 'extend' | 'unchanged';
export type ManualGrantAccessSource = 'none' | 'subscription' | 'school';

export interface ManualGrantTargetUser {
  $id: string;
  email: string;
  name: string;
}

export interface ManualGrantRequest {
  targetEmail: string;
  expiresAt: string;
  reason?: string;
}

export interface ManualGrantResponse {
  success: boolean;
  action: ManualGrantResolution;
  applied: boolean;
  currentAccessSource: ManualGrantAccessSource;
  previousEffectiveEndDate: string | null;
  finalEffectiveEndDate: string;
  targetUser: ManualGrantTargetUser;
  subscriptionId?: string | null;
  message: string;
}

function normalizeEmail(value?: string | null): string {
  return `${value || ''}`.trim().toLowerCase();
}

function parseAllowlist(value?: string): string[] {
  return `${value || ''}`
    .split(',')
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

class AdminPremiumService {
  private readonly functionId = ENV.APPWRITE_MANUAL_PREMIUM_FUNCTION_ID || 'manual-premium-grant';
  private readonly adminEmails = parseAllowlist(ENV.MONEYQUEST_ADMIN_ALLOWLIST_EMAILS);

  canAccessAdminGrant(user?: User | null): boolean {
    return this.adminEmails.includes(normalizeEmail(user?.email));
  }

  private async execute(action: ManualGrantAction, input: ManualGrantRequest): Promise<ManualGrantResponse> {
    const execution = await functions.createExecution(
      this.functionId,
      JSON.stringify({
        action,
        targetEmail: normalizeEmail(input.targetEmail),
        expiresAt: input.expiresAt,
        reason: input.reason?.trim() || '',
      }),
      false,
      '/',
      ExecutionMethod.POST,
      {
        'Content-Type': 'application/json',
      },
    );

    const payload = execution.responseBody ? JSON.parse(execution.responseBody) : null;

    if (execution.responseStatusCode >= 400 || !payload?.success) {
      throw new Error(
        payload?.message ||
          payload?.error ||
          `Manual premium grant failed (${execution.responseStatusCode})`,
      );
    }

    return payload as ManualGrantResponse;
  }

  async preview(input: ManualGrantRequest): Promise<ManualGrantResponse> {
    return this.execute('preview', input);
  }

  async grant(input: ManualGrantRequest): Promise<ManualGrantResponse> {
    const response = await this.execute('grant', input);

    if (response.applied) {
      await analyticsService.trackEvent(
        'feature_used',
        {
          admin_action: 'manual_premium_grant',
          grant_action: response.action,
          target_user_id: response.targetUser.$id,
          target_user_email: response.targetUser.email,
          final_expiry: response.finalEffectiveEndDate,
          access_source: response.currentAccessSource,
        },
        {
          featureName: 'admin_manual_premium_grant',
          valueText: response.targetUser.email,
        },
      );
    }

    return response;
  }
}

export const adminPremiumService = new AdminPremiumService();
export default adminPremiumService;
