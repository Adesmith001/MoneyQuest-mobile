import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { LeaderboardEntry } from '../../types';
import { databases, DB_ID, COLLECTIONS, Query } from '../../services/appwrite';

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

// Async thunks
export const fetchLeaderboard = createAsyncThunk(
  'leaderboard/fetchLeaderboard',
  async (options: { silent?: boolean } = {}, { rejectWithValue }) => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Fetch directly from users collection ordered by monthlyXP (include 0 XP users)
      const response = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.USERS,
        [
          Query.orderDesc('monthlyXP'),
          Query.limit(100),
        ]
      );

      const leaderboardEntries: LeaderboardEntry[] = response.documents.map((doc: any, index: number) => ({
        $id: doc.$id,
        userId: doc.$id,
        userName: doc.username || doc.name || 'Anonymous',
        avatar: doc.avatar || '',
        profilePicture: doc.profilePicture || '',
        monthlyXP: doc.monthlyXP || 0,
        rank: index + 1,
        month: `${currentMonth}`,
        year: currentYear,
      }));

      return leaderboardEntries;
    } catch (error: any) {
      return rejectWithValue(error.message);
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
          }
        );
      } else {
        // Create new entry
        const user = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
        await databases.createDocument(
          DB_ID,
          COLLECTIONS.LEADERBOARD,
          'unique()',
          {
            userId,
            userName: user.name,
            profilePicture: user.profilePicture || '',
            monthlyXP: xp,
            month: monthKey,
            year: currentYear,
            rank: 0, // Will be calculated after fetching all entries
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