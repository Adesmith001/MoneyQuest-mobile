import { ENV } from '../config/environment';
import {
  GamificationBootstrapResponse,
  GamificationProfileResponse,
  BadgeListResponse,
  BadgeCatalogueResponse,
  QuestTabResponse,
  QuestHistoryResponse,
  ChestListResponse,
  ChestClaimResult,
  ChestClaimRequest,
  RewardListResponse,
  GamificationReadinessResponse,
  GamificationEventRequest,
  GamificationResultBundle,
} from '../types/gamification';

/**
 * Gamification API Service
 *
 * Communicates with the backend gamification module at /api/gamification/*
 * All endpoints are gated behind the gamification feature flag on the backend.
 */
class GamificationApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = ENV.MONEYQUEST_API_BASE_URL;
  }

  // ── Generic fetch ─────────────────────────────

  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        (errorData as any)?.detail ||
        (errorData as any)?.message ||
        `Gamification API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return (await response.json()) as T;
  }

  // ── Bootstrap (app launch) ────────────────────

  /**
   * Get the complete gamification state for app bootstrap.
   * Call this once after auth to populate profile, badges, quests, rewards, chests.
   */
  async getBootstrap(userId: string): Promise<GamificationBootstrapResponse> {
    return this.fetchApi<GamificationBootstrapResponse>(
      `/api/gamification/bootstrap/${userId}`,
    );
  }

  // ── Profile ───────────────────────────────────

  async getProfile(userId: string): Promise<GamificationProfileResponse> {
    return this.fetchApi<GamificationProfileResponse>(
      `/api/gamification/profile/${userId}`,
    );
  }

  // ── Badges ────────────────────────────────────

  async getBadges(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<BadgeListResponse> {
    return this.fetchApi<BadgeListResponse>(
      `/api/gamification/badges/${userId}?limit=${limit}&offset=${offset}`,
    );
  }

  async getBadgeCatalogue(userId: string): Promise<BadgeCatalogueResponse> {
    return this.fetchApi<BadgeCatalogueResponse>(
      `/api/gamification/badges/${userId}/catalogue`,
    );
  }

  // ── Quests ────────────────────────────────────

  async getQuestTab(userId: string): Promise<QuestTabResponse> {
    return this.fetchApi<QuestTabResponse>(
      `/api/gamification/quests/${userId}/tab`,
    );
  }

  async getQuestHistory(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<QuestHistoryResponse> {
    return this.fetchApi<QuestHistoryResponse>(
      `/api/gamification/quests/${userId}/history?limit=${limit}&offset=${offset}`,
    );
  }

  // ── Chests ────────────────────────────────────

  async getChests(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ChestListResponse> {
    return this.fetchApi<ChestListResponse>(
      `/api/gamification/chests/${userId}?limit=${limit}&offset=${offset}`,
    );
  }

  async claimChest(
    claimId: string,
    userId: string,
    claimRequestId: string,
  ): Promise<ChestClaimResult> {
    const body: ChestClaimRequest = {
      user_id: userId,
      claim_request_id: claimRequestId,
    };
    return this.fetchApi<ChestClaimResult>(
      `/api/gamification/chests/${claimId}/claim`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  // ── Rewards ───────────────────────────────────

  async getRewards(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<RewardListResponse> {
    return this.fetchApi<RewardListResponse>(
      `/api/gamification/rewards/${userId}?limit=${limit}&offset=${offset}`,
    );
  }

  // ── Events ────────────────────────────────────

  /**
   * Submit a gamification event (e.g. LESSON_COMPLETED).
   * The backend processes streaks, quests, badges, rewards, and chests in order.
   * Returns the full result bundle with everything that happened.
   */
  async submitEvent(
    event: GamificationEventRequest,
  ): Promise<GamificationResultBundle> {
    return this.fetchApi<GamificationResultBundle>(
      `/api/gamification/events`,
      {
        method: 'POST',
        body: JSON.stringify(event),
      },
    );
  }

  // ── Readiness / Feature Flags ─────────────────

  async getReadiness(): Promise<GamificationReadinessResponse> {
    return this.fetchApi<GamificationReadinessResponse>(
      `/api/gamification/readiness`,
    );
  }
}

// Export singleton
const gamificationApi = new GamificationApiService();
export default gamificationApi;
