import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ID } from 'react-native-appwrite';
import { LeaderboardEntry } from '../../types';
import { databases, DB_ID, COLLECTIONS, Query } from '../../services/appwrite';
import { shouldResetMonthlyXP } from '../../utils';
import { selectLeaderboardStreak } from '../../utils/progressBehavior';

interface LeaderboardState {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  hasLoaded: boolean;  // true once the first fetch completes
  error: string | null;
  currentUserRank: number | null;
}

const initialState: LeaderboardState = {
  entries: [],
  isLoading: false,
  hasLoaded: false,
  error: null,
  currentUserRank: null,
};

const STREAK_QUERY_BATCH_SIZE = 100;

const getResolvedMonthlyXP = (doc: any, now: Date): number =>
  shouldResetMonthlyXP(doc?.lastMonthlyReset, now) ? 0 : Number(doc?.monthlyXP || 0);

const rankLeaderboardEntries = (entries: LeaderboardEntry[]): LeaderboardEntry[] =>
  [...entries]
    .sort((a, b) => b.monthlyXP - a.monthlyXP)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

const buildStreakMapForUserIds = async (userIds: string[]): Promise<Map<string, number>> => {
  const streakMap = new Map<string, number>();
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (uniqueUserIds.length === 0) {
    return streakMap;
  }

  for (let index = 0; index < uniqueUserIds.length; index += STREAK_QUERY_BATCH_SIZE) {
    const chunk = uniqueUserIds.slice(index, index + STREAK_QUERY_BATCH_SIZE);

    try {
      const response = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.STREAKS,
        [
          Query.equal('userId', chunk),
          Query.limit(STREAK_QUERY_BATCH_SIZE),
        ]
      );

      response.documents.forEach((doc: any) => {
        const userId = String(doc.userId || '');
        if (!userId) {
          return;
        }

        const streakValue = selectLeaderboardStreak(doc);
        const previousValue = streakMap.get(userId) ?? 0;

        if (streakValue >= previousValue) {
          streakMap.set(userId, streakValue);
        }
      });
    } catch (error) {
      console.warn('Failed to load streak data for leaderboard users:', error);
    }
  }

  return streakMap;
};

const buildLeaderboardEntries = (
  documents: any[],
  currentDate: Date,
  currentMonth: number,
  currentYear: number,
  streakMap?: Map<string, number>
): LeaderboardEntry[] =>
  rankLeaderboardEntries(documents.map((doc: any) => ({
    $id: doc.$id,
    userId: doc.$id,
    userName: doc.username || doc.name || 'Anonymous',
    avatar: doc.avatar || '',
    profilePicture: doc.profilePicture || '',
    monthlyXP: getResolvedMonthlyXP(doc, currentDate),
    // Always prefer streak collection value (same source as Streak screen)
    streak: streakMap?.get(doc.$id) ?? 0,
    rank: 0,
    month: `${currentMonth}`,
    year: currentYear,
  })));

const buildLeaderboardEntriesFromTable = (
  documents: any[],
  currentMonth: number,
  currentYear: number,
  streakMap?: Map<string, number>
): LeaderboardEntry[] =>
  documents.map((doc: any, index: number) => {
    const userId = doc.userId || doc.$id;

    return {
      $id: doc.$id,
      userId,
      userName: doc.userName || 'Anonymous',
      avatar: '',
      profilePicture: doc.profilePicture || '',
      monthlyXP: doc.monthlyXP || 0,
      // Always prefer streak collection value (same source as Streak screen)
      streak: streakMap?.get(userId) ?? 0,
      rank: doc.rank || index + 1,
      month: `${currentMonth}`,
      year: currentYear,
    };
  });

const syncLeaderboardSnapshot = async (entries: LeaderboardEntry[]) => {
  if (entries.length === 0) {
    return;
  }

  const currentMonth = entries[0].month;
  const currentYear = entries[0].year;

  const existingResponse = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.LEADERBOARD,
    [
      Query.equal('month', currentMonth),
      Query.equal('year', currentYear),
      Query.limit(200),
    ]
  );

  const existingByUserId = new Map(
    existingResponse.documents.map((doc: any) => [doc.userId, doc])
  );

  const writes: Promise<any>[] = [];

  for (const entry of entries) {
    const existing = existingByUserId.get(entry.userId);
    const payload = {
      userId: entry.userId,
      userName: entry.userName,
      profilePicture: entry.profilePicture || '',
      monthlyXP: entry.monthlyXP,
      streak: entry.streak ?? 0,
      month: entry.month,
      year: entry.year,
      rank: entry.rank,
    };

    if (!existing) {
      writes.push(
        databases.createDocument(
          DB_ID,
          COLLECTIONS.LEADERBOARD,
          ID.unique(),
          payload
        )
      );
      continue;
    }

    const hasChanged =
      existing.userName !== payload.userName ||
      (existing.profilePicture || '') !== payload.profilePicture ||
      (existing.monthlyXP || 0) !== payload.monthlyXP ||
      (existing.streak || 0) !== payload.streak ||
      `${existing.month}` !== payload.month ||
      Number(existing.year || 0) !== payload.year ||
      Number(existing.rank || 0) !== payload.rank;

    if (hasChanged) {
      writes.push(
        databases.updateDocument(
          DB_ID,
          COLLECTIONS.LEADERBOARD,
          existing.$id,
          payload
        )
      );
    }
  }

  if (writes.length > 0) {
    await Promise.all(writes);
  }
};

// Async thunks
export const fetchLeaderboard = createAsyncThunk(
  'leaderboard/fetchLeaderboard',
  async (options: { silent?: boolean } = {}, { rejectWithValue }) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    try {
      const response = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.USERS,
        [
          Query.orderDesc('monthlyXP'),
          Query.limit(100),
        ]
      );

      const userIds = response.documents.map((doc: any) => String(doc.$id || '')).filter(Boolean);
      const streakMap = await buildStreakMapForUserIds(userIds);

      const leaderboardEntries = buildLeaderboardEntries(
        response.documents,
        currentDate,
        currentMonth,
        currentYear,
        streakMap
      );

      try {
        await syncLeaderboardSnapshot(leaderboardEntries);
      } catch (syncError) {
        console.warn(
          'Leaderboard snapshot sync failed; showing live user data instead:',
          syncError
        );
      }

      return leaderboardEntries;
    } catch (usersError: any) {
      try {
        const snapshotResponse = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.LEADERBOARD,
          [
            Query.equal('month', `${currentMonth}`),
            Query.equal('year', currentYear),
            Query.orderDesc('monthlyXP'),
            Query.limit(100),
          ]
        );

        const snapshotUserIds = snapshotResponse.documents
          .map((doc: any) => String(doc.userId || doc.$id || ''))
          .filter(Boolean);
        const streakMap = await buildStreakMapForUserIds(snapshotUserIds);

        return buildLeaderboardEntriesFromTable(
          snapshotResponse.documents,
          currentMonth,
          currentYear,
          streakMap
        );
      } catch (snapshotError: any) {
        return rejectWithValue(
          snapshotError?.message || usersError?.message || 'Failed to fetch leaderboard'
        );
      }
    }
  }
);

export const updateUserRank = createAsyncThunk(
  'leaderboard/updateUserRank',
  async ({ userId, xp }: { userId: string; xp: number }, { rejectWithValue }) => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const monthKey = `${currentMonth}`;
      const user = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      const streakMap = await buildStreakMapForUserIds([userId]);
      const currentStreak = streakMap.get(userId) ?? 0;

      // Check if user already has a leaderboard entry for this month
      const existingEntry = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.LEADERBOARD,
        [
          Query.equal('userId', userId),
          Query.equal('month', monthKey),
          Query.equal('year', currentYear)
        ]
      );

      if (existingEntry.documents.length > 0) {
        // Update existing entry
        const entryId = existingEntry.documents[0].$id;
        await databases.updateDocument(
          DB_ID,
          COLLECTIONS.LEADERBOARD,
          entryId,
          {
            monthlyXP: xp,
            streak: currentStreak,
          }
        );
      } else {
        // Create new entry
        await databases.createDocument(
          DB_ID,
          COLLECTIONS.LEADERBOARD,
          ID.unique(),
          {
            userId,
            userName: user.username || user.name || 'Anonymous',
            profilePicture: user.profilePicture || '',
            monthlyXP: xp,
            streak: currentStreak,
            month: monthKey,
            year: currentYear,
            rank: 1, // Appwrite column enforces a minimum rank of 1
          }
        );
      }

      return xp;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentUserRank: (state, action: PayloadAction<number>) => {
      state.currentUserRank = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaderboard.pending, (state, action) => {
        // Don't show loading spinner on silent background refreshes
        if (!action.meta.arg?.silent) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hasLoaded = true;
        state.entries = action.payload;
        state.error = null;
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateUserRank.fulfilled, (state) => {
        // Refetch leaderboard after updating user rank
        state.error = null;
      })
      .addCase(updateUserRank.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentUserRank } = leaderboardSlice.actions;
export default leaderboardSlice.reducer;
