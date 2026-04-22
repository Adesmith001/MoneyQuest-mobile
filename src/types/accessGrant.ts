export type AdminAccessGrantStatus = 'active' | 'expired' | 'revoked';

export interface AdminAccessGrant {
  $id?: string;
  userId: string;
  grantedByUserId: string;
  reason: string;
  startsAt: string;
  expiresAt: string;
  status: AdminAccessGrantStatus;
  revokedAt?: string;
  revokedByUserId?: string;
  revokedReason?: string;
  createdAt: string;
  updatedAt: string;
}
