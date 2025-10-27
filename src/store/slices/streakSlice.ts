import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import StreakService, { StreakData } from '../../services/streak';

export interface StreakState {
  currentStreak: number;
  totalStreak: number;
  longestStreak: number;
  weeklyStreak: number;
  daysThisMonth: number;
  streakStartDate: string;
  lastLoginDate: string;
  isLoading: boolean;
  error: string | null;
  loginHistory: string[];
}

const initialState: StreakState = {
  currentStreak: 0,
  totalStreak: 0,
  longestStreak: 0,
  weeklyStreak: 0,
  daysThisMonth: 0,
  streakStartDate: '',
  lastLoginDate: '',
  isLoading: false,
  error: null,
  loginHistory: [],
};

// Async thunks
export const updateStreakOnLogin = createAsyncThunk(
  'streak/updateOnLogin',
  async (userId: string, { rejectWithValue }) => {
    try {
      const streakData = await StreakService.updateStreakOnLogin(userId);
      const stats = await StreakService.getStreakStats(userId);
      return { streakData, stats };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadStreakData = createAsyncThunk(
  'streak/loadData',
  async (userId: string, { rejectWithValue }) => {
    try {
      const streakData = await StreakService.getStreakData(userId);
      const stats = await StreakService.getStreakStats(userId);
      return { streakData, stats };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const getStreakStats = createAsyncThunk(
  'streak/getStats',
  async (userId: string, { rejectWithValue }) => {
    try {
      const stats = await StreakService.getStreakStats(userId);
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkTodayLogin = createAsyncThunk(
  'streak/checkTodayLogin',
  async (userId: string, { rejectWithValue }) => {
    try {
      const hasLoggedIn = await StreakService.hasLoggedInToday(userId);
      return hasLoggedIn;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const getWeeklyStreak = createAsyncThunk(
  'streak/getWeeklyStreak',
  async (userId: string, { rejectWithValue }) => {
    try {
      const weeklyStreak = await StreakService.getWeeklyStreak(userId);
      return weeklyStreak;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const streakSlice = createSlice({
  name: 'streak',
  initialState,
  reducers: {
    clearStreakError: (state) => {
      state.error = null;
    },
    resetStreakState: (state) => {
      return initialState;
    },
    setStreakData: (state, action: PayloadAction<StreakData & { longestStreak?: number; weeklyStreak?: number }>) => {
      const { currentStreak, totalStreak, lastLoginDate, streakStartDate, loginHistory, longestStreak, weeklyStreak } = action.payload;
      state.currentStreak = currentStreak;
      state.totalStreak = totalStreak;
      state.lastLoginDate = lastLoginDate;
      state.streakStartDate = streakStartDate;
      state.loginHistory = loginHistory || [];
      if (longestStreak !== undefined) state.longestStreak = longestStreak;
      if (weeklyStreak !== undefined) state.weeklyStreak = weeklyStreak;
    },
  },
  extraReducers: (builder) => {
    // Update streak on login
    builder
      .addCase(updateStreakOnLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateStreakOnLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        const { streakData, stats } = action.payload;
        state.currentStreak = streakData.currentStreak;
        state.totalStreak = streakData.totalStreak;
        state.lastLoginDate = streakData.lastLoginDate;
        state.streakStartDate = streakData.streakStartDate;
        state.loginHistory = streakData.loginHistory || [];

        // Also update from stats, which might have more up-to-date calculated values
        if (stats.currentStreak !== undefined) state.currentStreak = stats.currentStreak;
        if (stats.totalStreak !== undefined) state.totalStreak = stats.totalStreak;
        if (stats.longestStreak !== undefined) state.longestStreak = stats.longestStreak;
        if (stats.weeklyStreak !== undefined) state.weeklyStreak = stats.weeklyStreak;
      })
      .addCase(updateStreakOnLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Load streak data
    builder
      .addCase(loadStreakData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadStreakData.fulfilled, (state, action) => {
        state.isLoading = false;
        const { streakData, stats } = action.payload;
        state.currentStreak = streakData.currentStreak;
        state.totalStreak = streakData.totalStreak;
        state.lastLoginDate = streakData.lastLoginDate;
        state.streakStartDate = streakData.streakStartDate;
        state.loginHistory = streakData.loginHistory || [];
        if (stats.longestStreak !== undefined) state.longestStreak = stats.longestStreak;
        if (stats.weeklyStreak !== undefined) state.weeklyStreak = stats.weeklyStreak;
      })
      .addCase(loadStreakData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get streak stats
    builder
      .addCase(getStreakStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getStreakStats.fulfilled, (state, action) => {
        state.isLoading = false;
        const stats = action.payload;
        state.currentStreak = stats.currentStreak;
        state.totalStreak = stats.totalStreak;
        state.streakStartDate = stats.streakStartDate;
        if (stats.longestStreak !== undefined) state.longestStreak = stats.longestStreak;
        if (stats.weeklyStreak !== undefined) state.weeklyStreak = stats.weeklyStreak;
      })
      .addCase(getStreakStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearStreakError, resetStreakState, setStreakData } = streakSlice.actions;
export default streakSlice.reducer;