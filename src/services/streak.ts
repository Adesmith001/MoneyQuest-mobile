import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StreakData {
  currentStreak: number;
  totalStreak: number;
  lastLoginDate: string;
  streakStartDate: string;
  loginHistory: string[]; 
}

class StreakService {
  private static readonly STREAK_STORAGE_KEY = 'user_streak_data';

  // Get streak data from local storage
  async getStreakData(userId: string): Promise<StreakData> {
    try {
      const key = `${StreakService.STREAK_STORAGE_KEY}_${userId}`;
      const storedData = await AsyncStorage.getItem(key);
      
      if (storedData) {
        const data = JSON.parse(storedData);
        // Ensure loginHistory exists for backward compatibility
        if (!data.loginHistory) {
          data.loginHistory = data.lastLoginDate ? [data.lastLoginDate.split('T')[0]] : [];
        }
        return data;
      }
      
      // Return default streak data if nothing is stored
      const now = new Date().toISOString();
      return {
        currentStreak: 0,
        totalStreak: 0,
        lastLoginDate: '',
        streakStartDate: now,
        loginHistory: [],
      };
    } catch (error) {
      console.error('Error getting streak data:', error);
      return {
        currentStreak: 0,
        totalStreak: 0,
        lastLoginDate: '',
        streakStartDate: new Date().toISOString(),
        loginHistory: [],
      };
    }
  }

  // Save streak data to local storage
  async saveStreakData(userId: string, streakData: StreakData): Promise<void> {
    try {
      const key = `${StreakService.STREAK_STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(streakData));
    } catch (error) {
      console.error('Error saving streak data:', error);
    }
  }

  // Update streak when user logs in
  async updateStreakOnLogin(userId: string): Promise<StreakData> {
    const streakData = await this.getStreakData(userId);
    const now = new Date();
    const today = this.getDateString(now);
    const lastLogin = streakData.lastLoginDate ? new Date(streakData.lastLoginDate) : null;
    const lastLoginDate = lastLogin ? this.getDateString(lastLogin) : '';

    // Check if user already logged in today
    if (lastLoginDate === today) {
      return streakData;
    }

    // Update login history
    const updatedHistory = new Set(streakData.loginHistory || []);
    updatedHistory.add(today);

    // Clean up history to keep only the last 14 days to prevent storage bloat
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 13); // Keep today + 13 previous days
    const cleanedHistory = Array.from(updatedHistory).filter(
      dateString => new Date(dateString) >= fourteenDaysAgo
    );

    // Check if login is consecutive (yesterday)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = this.getDateString(yesterday);

    let newStreakData: StreakData;

    if (lastLoginDate === yesterdayString) {
      // Consecutive day - increment streak
      newStreakData = {
        ...streakData,
        currentStreak: streakData.currentStreak + 1,
        totalStreak: streakData.totalStreak + 1,
        lastLoginDate: now.toISOString(),
        loginHistory: cleanedHistory,
      };
    } else if (lastLoginDate === '') {
      // First time login or no previous data
      newStreakData = {
        ...streakData,
        currentStreak: 1,
        totalStreak: streakData.totalStreak + 1,
        lastLoginDate: now.toISOString(),
        streakStartDate: now.toISOString(),
        loginHistory: cleanedHistory,
      };
    } else {
      // Streak broken - reset current streak but keep total
      newStreakData = {
        ...streakData,
        currentStreak: 1,
        totalStreak: streakData.totalStreak + 1,
        lastLoginDate: now.toISOString(),
        streakStartDate: now.toISOString(),
        loginHistory: cleanedHistory,
      };
    }

    await this.saveStreakData(userId, newStreakData);
    return newStreakData;
  }

  // Get the current streak for a user
  async getCurrentStreak(userId: string): Promise<number> {
    const streakData = await this.getStreakData(userId);
    return streakData.currentStreak;
  }

  // Get the total streak for a user
  async getTotalStreak(userId: string): Promise<number> {
    const streakData = await this.getStreakData(userId);
    return streakData.totalStreak;
  }

  // Check if user has logged in today
  async hasLoggedInToday(userId: string): Promise<boolean> {
    const streakData = await this.getStreakData(userId);
    if (!streakData.lastLoginDate) return false;
    
    const today = this.getDateString(new Date());
    const lastLogin = this.getDateString(new Date(streakData.lastLoginDate));
    
    return today === lastLogin;
  }

  // Helper function to get date string in YYYY-MM-DD format
  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Helper function to get the start of the month
  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  // Clear streak data (useful for testing or account deletion)
  async clearStreakData(userId: string): Promise<void> {
    try {
      const key = `${StreakService.STREAK_STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing streak data:', error);
    }
  }

  // Get streak statistics for display
  async getStreakStats(userId: string): Promise<{
    currentStreak: number;
    totalStreak: number;
    streakStartDate: string;
  }> {
    const streakData = await this.getStreakData(userId);

    return {
      currentStreak: streakData.currentStreak,
      totalStreak: streakData.totalStreak,
      streakStartDate: streakData.streakStartDate,
    };
  }
}

export default new StreakService();