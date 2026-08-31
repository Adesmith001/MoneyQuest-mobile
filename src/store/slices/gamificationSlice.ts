import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import gamificationApi from '../../services/gamificationApi';
import {
  GamificationSummary,
  StreakState,
  NextBadgeProgress,
  BadgeCatalogueEntry,
  QuestTabEntry,
  ChestStateItem,
  RewardLedgerEntry,
  GamificationResultBundle,
  CelebrationPayload,
} from '../../types/gamification';
import { buildCelebrationsFromBundle } from '../../utils/gamificationPresentation';

// ── State ──────────────────────────────────────

export interface GamificationState {
  // Summary (from bootstrap / profile)
  summary: GamificationSummary | null;
  streak: StreakState | null;
  nextBadgeProgress: NextBadgeProgress | null;
  featureFlags: Record<string, boolean>;

  // Badges
  badgeCatalogue: BadgeCatalogueEntry[];
  earnedBadgeCount: number;
  totalBadgeCount: number;

  // Quests
  activeQuests: QuestTabEntry[];
  readyChestsCount: number;

  // Rewards
  rewardBalance: number;

  // Chests
  chests: ChestStateItem[];

  // Celebration (from last event)
  lastResultBundle: GamificationResultBundle | null;
  pendingCelebrations: CelebrationPayload[];

  // Loading states
  isBootstrapped: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: GamificationState = {
  summary: null,
  streak: null,
  nextBadgeProgress: null,
  featureFlags: {},

  badgeCatalogue: [],
  earnedBadgeCount: 0,
  totalBadgeCount: 0,

  activeQuests: [],
  readyChestsCount: 0,

  rewardBalance: 0,

  chests: [],

  lastResultBundle: null,
  pendingCelebrations: [],

  isBootstrapped: false,
  isLoading: false,
  error: null,
};

// ── Async Thunks ───────────────────────────────

/**
 * Bootstrap: fetch everything the app needs for gamification in one call.
 * Should be dispatched once after auth is confirmed.
 */
export const bootstrapGamification = createAsyncThunk(
  'gamification/bootstrap',
  async (userId: string, { rejectWithValue }) => {
    try {
      const [bootstrap, questTab] = await Promise.all([
        gamificationApi.getBootstrap(userId),
        gamificationApi.getQuestTab(userId).catch(() => null),
      ]);
      return { ...bootstrap, questTab };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load gamification');
    }
  },
);

/**
 * Load quest tab data (active quests + ready chests count).
 */
export const fetchQuestTab = createAsyncThunk(
  'gamification/fetchQuestTab',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await gamificationApi.getQuestTab(userId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load quests');
    }
  },
);

/**
 * Load the full badge catalogue with earned state.
 */
export const fetchBadgeCatalogue = createAsyncThunk(
  'gamification/fetchBadgeCatalogue',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await gamificationApi.getBadgeCatalogue(userId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load badge catalogue');
    }
  },
);

/**
 * Claim a chest reward.
 */
export const claimChest = createAsyncThunk(
  'gamification/claimChest',
  async (
    { claimId, userId }: { claimId: string; userId: string },
    { rejectWithValue },
  ) => {
    try {
      const claimRequestId = `claim-${userId}-${claimId}`;
      const result = await gamificationApi.claimChest(
        claimId,
        userId,
        claimRequestId,
      );
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to claim chest');
    }
  },
);

export const fetchChests = createAsyncThunk(
  'gamification/fetchChests',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await gamificationApi.getChests(userId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load chests');
    }
  },
);

/**
 * Load rewards history.
 */
export const fetchRewards = createAsyncThunk(
  'gamification/fetchRewards',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await gamificationApi.getRewards(userId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load rewards');
    }
  },
);

/**
 * Refresh the profile summary (e.g. after returning to home screen).
 */
export const refreshProfile = createAsyncThunk(
  'gamification/refreshProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await gamificationApi.getProfile(userId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to refresh profile');
    }
  },
);

// ── Slice ──────────────────────────────────────

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    /**
     * Store a result bundle from a gamification event (e.g. after lesson completion).
     * This extracts celebration payloads for the UI to consume.
     */
    processEventResult: (
      state,
      action: PayloadAction<GamificationResultBundle>,
    ) => {
      const bundle = action.payload;
      state.lastResultBundle = bundle;

      // Update summary in-place from bundle
      if (bundle.summary) {
        state.summary = bundle.summary;
        state.readyChestsCount = bundle.summary.ready_chests_count;
      }

      // Update streak from bundle
      if (bundle.streak) {
        state.streak = {
          user_id: bundle.user_id,
          current_streak: bundle.streak.current_streak,
          longest_streak: bundle.streak.longest_streak,
          last_qualified_date: bundle.streak.business_date,
          last_source_event_id: bundle.streak.source_event_id,
          timezone: 'Africa/Lagos',
          total_qualified_days: 0,
          created_at: null,
          updated_at: null,
        };
      }

      state.pendingCelebrations = buildCelebrationsFromBundle(bundle);
    },

    /**
     * Clear pending celebrations (after they've been shown).
     */
    clearCelebrations: (state) => {
      state.pendingCelebrations = [];
    },

    /**
     * Pop the next celebration from the queue.
     */
    dismissCelebration: (state) => {
      state.pendingCelebrations = state.pendingCelebrations.slice(1);
    },

    /**
     * Reset gamification state (on logout).
     */
    resetGamification: () => initialState,
  },

  extraReducers: (builder) => {
    // ── Bootstrap ─────────────────────────────
    builder
      .addCase(bootstrapGamification.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bootstrapGamification.fulfilled, (state, action) => {
        const { profile, badges, rewards, chests, questTab } = action.payload;

        state.summary = profile.summary;
        state.streak = profile.streak;
        state.nextBadgeProgress = profile.next_badge_progress;
        state.featureFlags = profile.feature_flags;

        state.badgeCatalogue = badges.catalog ?? [];
        state.earnedBadgeCount = badges.earned_count;
        state.totalBadgeCount = badges.total_count;

        // Use quest tab data (has proper name/code/description) if available
        if (questTab && questTab.quests) {
          state.activeQuests = questTab.quests;
          state.readyChestsCount = questTab.ready_chests_count;
        } else {
          state.activeQuests = [];
          state.readyChestsCount = 0;
        }

        state.chests = chests.states ?? [];
        state.rewardBalance = rewards.balance;

        state.isBootstrapped = true;
        state.isLoading = false;
      })
      .addCase(bootstrapGamification.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ── Quest Tab ─────────────────────────────
    builder
      .addCase(fetchQuestTab.fulfilled, (state, action) => {
        state.activeQuests = action.payload.quests;
        state.readyChestsCount = action.payload.ready_chests_count;
      });

    builder
      .addCase(fetchChests.fulfilled, (state, action) => {
        state.chests = action.payload.states ?? [];
      });

    // ── Badge Catalogue ───────────────────────
    builder
      .addCase(fetchBadgeCatalogue.fulfilled, (state, action) => {
        state.badgeCatalogue = action.payload.badges;
        state.earnedBadgeCount = action.payload.earned_count;
        state.totalBadgeCount = action.payload.total_count;
        state.nextBadgeProgress = action.payload.next_badge;
      });

    // ── Claim Chest ───────────────────────────
    builder
      .addCase(claimChest.fulfilled, (state, action) => {
        const result = action.payload;
        if (result.was_claimed_now && result.reward) {
          state.rewardBalance += result.reward.amount;
        }
        // Update chest status
        const chestIndex = state.chests.findIndex(
          (c) => c.chest_claim_id === result.chest_claim_id,
        );
        if (chestIndex >= 0) {
          state.chests[chestIndex].status = result.status;
          state.chests[chestIndex].is_claimable = false;
          state.chests[chestIndex].claimed_at = new Date().toISOString();
        }
        if (result.summary) {
          state.summary = result.summary;
          state.readyChestsCount = result.summary.ready_chests_count;
        }
      });

    // ── Rewards ───────────────────────────────
    builder
      .addCase(fetchRewards.fulfilled, (state, action) => {
        state.rewardBalance = action.payload.balance;
      });

    // ── Refresh Profile ───────────────────────
    builder
      .addCase(refreshProfile.fulfilled, (state, action) => {
        state.summary = action.payload.summary;
        state.streak = action.payload.streak;
        state.nextBadgeProgress = action.payload.next_badge_progress;
        state.featureFlags = action.payload.feature_flags;
      });
  },
});

// ── Actions ────────────────────────────────────

export const {
  processEventResult,
  clearCelebrations,
  dismissCelebration,
  resetGamification,
} = gamificationSlice.actions;

// ── Selectors ──────────────────────────────────

export const selectGamificationSummary = (state: { gamification: GamificationState }) =>
  state.gamification.summary;
export const selectStreak = (state: { gamification: GamificationState }) =>
  state.gamification.streak;
export const selectNextBadgeProgress = (state: { gamification: GamificationState }) =>
  state.gamification.nextBadgeProgress;
export const selectBadgeCatalogue = (state: { gamification: GamificationState }) =>
  state.gamification.badgeCatalogue;
export const selectActiveQuests = (state: { gamification: GamificationState }) =>
  state.gamification.activeQuests;
export const selectPendingCelebrations = (state: { gamification: GamificationState }) =>
  state.gamification.pendingCelebrations;
export const selectRewardBalance = (state: { gamification: GamificationState }) =>
  state.gamification.rewardBalance;
export const selectIsBootstrapped = (state: { gamification: GamificationState }) =>
  state.gamification.isBootstrapped;

export default gamificationSlice.reducer;
