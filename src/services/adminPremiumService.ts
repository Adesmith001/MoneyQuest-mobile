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

export interface AdminMember {
  email: string;
  userId?: string | null;
  status: string;
  source: 'bootstrap' | 'managed';
  addedByEmail?: string | null;
  updatedAt?: string | null;
}

export interface AdminListResponse {
  success: boolean;
  admins: AdminMember[];
  adminCollectionConfigured: boolean;
  message: string;
}

export interface AddAdminResponse {
  success: boolean;
  applied: boolean;
  admin: AdminMember;
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

  private async execute<T>(payload: Record<string, unknown>): Promise<T> {
    const execution = await functions.createExecution(
      this.functionId,
      JSON.stringify(payload),
      false,
      '/',
      ExecutionMethod.POST,
      {
        'Content-Type': 'application/json',
      },
    );

    const bodyPayload = execution.responseBody ? JSON.parse(execution.responseBody) : null;

    if (execution.responseStatusCode >= 400 || !bodyPayload?.success) {
      throw new Error(
        bodyPayload?.message ||
          bodyPayload?.error ||
          `Admin action failed (${execution.responseStatusCode})`,
      );
    }

    return bodyPayload as T;
  }

  async preview(input: ManualGrantRequest): Promise<ManualGrantResponse> {
    return this.execute<ManualGrantResponse>({
      action: 'preview',
      targetEmail: normalizeEmail(input.targetEmail),
      expiresAt: input.expiresAt,
      reason: input.reason?.trim() || '',
    });
  }

  async grant(input: ManualGrantRequest): Promise<ManualGrantResponse> {
    const response = await this.execute<ManualGrantResponse>({
      action: 'grant',
      targetEmail: normalizeEmail(input.targetEmail),
      expiresAt: input.expiresAt,
      reason: input.reason?.trim() || '',
    });

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

  async listAdmins(): Promise<AdminListResponse> {
    return this.execute<AdminListResponse>({
      action: 'list_admins',
    });
  }

  async addAdmin(adminEmail: string): Promise<AddAdminResponse> {
    const normalized = normalizeEmail(adminEmail);
    if (!normalized) {
      throw new Error('Admin email is required.');
    }

    return this.execute<AddAdminResponse>({
      action: 'add_admin',
      adminEmail: normalized,
    });
  }
}

export const adminPremiumService = new AdminPremiumService();
export default adminPremiumService;
