import AsyncStorage from '@react-native-async-storage/async-storage';
import { databases, DB_ID, COLLECTIONS, Query } from './appwrite';
import { AdminAccessGrant } from '../types/accessGrant';

class AccessGrantService {
  private localCacheKey(userId: string): string {
    return `access_grant_cache_${userId}`;
  }

  private isGrantActive(grant: AdminAccessGrant): boolean {
    if (grant.status !== 'active') {
      return false;
    }

    const now = Date.now();
    const startsAt = new Date(grant.startsAt).getTime();
    const expiresAt = new Date(grant.expiresAt).getTime();

    if (!Number.isFinite(startsAt) || !Number.isFinite(expiresAt)) {
      return false;
    }

    return now >= startsAt && now < expiresAt;
  }

  private getDaysRemaining(grant: AdminAccessGrant): number {
    const expiresAt = new Date(grant.expiresAt).getTime();
    const diffMs = expiresAt - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  async saveGrantLocally(userId: string, grant: AdminAccessGrant | null): Promise<void> {
    try {
      if (!grant) {
        await AsyncStorage.removeItem(this.localCacheKey(userId));
        return;
      }

      await AsyncStorage.setItem(this.localCacheKey(userId), JSON.stringify(grant));
    } catch {
      // Local persistence failures should not block access checks
    }
  }

  async getLocalGrant(userId: string): Promise<AdminAccessGrant | null> {
    try {
      const raw = await AsyncStorage.getItem(this.localCacheKey(userId));
      if (!raw) return null;
      return JSON.parse(raw) as AdminAccessGrant;
    } catch {
      return null;
    }
  }

  async checkLocalGrantAccess(userId: string): Promise<{
    hasAccess: boolean;
    grant: AdminAccessGrant | null;
    daysRemaining: number;
  }> {
    const grant = await this.getLocalGrant(userId);
    if (!grant || !this.isGrantActive(grant)) {
      return { hasAccess: false, grant: null, daysRemaining: 0 };
    }

    return {
      hasAccess: true,
      grant,
      daysRemaining: this.getDaysRemaining(grant),
    };
  }

  async refreshGrantCache(userId: string): Promise<void> {
    const collectionId = COLLECTIONS.ADMIN_ACCESS_GRANTS;
    if (!collectionId) {
      return;
    }

    try {
      const response = await databases.listDocuments(DB_ID, collectionId, [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(25),
      ]);

      const documents = response.documents as unknown as AdminAccessGrant[];
      const activeGrant = documents.find((grant) => this.isGrantActive(grant)) || null;
      await this.saveGrantLocally(userId, activeGrant);
    } catch {
      // Keep stale local grant cache when network fetch fails
    }
  }

  async hasActiveGrant(userId: string): Promise<{
    hasAccess: boolean;
    grant: AdminAccessGrant | null;
    daysRemaining: number;
  }> {
    const local = await this.checkLocalGrantAccess(userId);
    if (local.hasAccess) {
      return local;
    }

    await this.refreshGrantCache(userId);
    return this.checkLocalGrantAccess(userId);
  }
}

export const accessGrantService = new AccessGrantService();
export default accessGrantService;
