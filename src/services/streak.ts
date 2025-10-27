import AsyncStorage from '@react-native-async-storage/async-storage';
import AppwriteStreakService, { StreakData as AppwriteStreakData } from './streakAppwrite';

export interface StreakData {
  currentStreak: number;
  totalStreak: number;
  lastLoginDate: string;
  streakStartDate: string;
  loginHistory: string[];
}

// Legacy interface for backward compatibility
interface LegacyStreakData {
  currentStreak: number;
  totalStreak: number;
  lastLoginDate: string;
  streakStartDate: string;
  loginHistory: string[];
}

class StreakService {
  private static readonly STREAK_STORAGE_KEY = 'user_streak_data';
  private static readonly MIGRATION_COMPLETE_KEY = 'streak_migration_complete';

  // Check if migration to Appwrite has been completed
  private async isMigrationComplete(userId: string): Promise<boolean> {
    try {
      const migrationKey = `${StreakService.MIGRATION_COMPLETE_KEY}_${userId}`;
      const migrationStatus = await AsyncStorage.getItem(migrationKey);
      return migrationStatus === 'true';
    } catch {
      return false;
    }
  }

  // Mark migration as complete
  private async markMigrationComplete(userId: string): Promise<void> {
    try {
      const migrationKey = `${StreakService.MIGRATION_COMPLETE_KEY}_${userId}`;
      await AsyncStorage.setItem(migrationKey, 'true');
    } catch (error) {
      console.error('Error marking migration complete:', error);
    }
  }

  // Get legacy streak data from local storage
  private async getLegacyStreakData(userId: string): Promise<LegacyStreakData | null> {
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
      return null;
    } catch (error) {
      console.error('Error getting legacy streak data:', error);
      return null;
    }
  }

  // Convert Appwrite streak data to legacy format
  private convertAppwriteToLegacy(appwriteData: AppwriteStreakData): StreakData {
    return {
      currentStreak: appwriteData.currentStreak,
      totalStreak: appwriteData.totalLoginDays, // Map totalLoginDays to totalStreak for compatibility
      lastLoginDate: appwriteData.lastLoginDate,
      streakStartDate: appwriteData.streakStartDate,
      loginHistory: appwriteData.loginHistory,
    };
  }

  // Get streak data - now uses Appwrite with migration support
  async getStreakData(userId: string): Promise<StreakData> {
    try {
      const migrationComplete = await this.isMigrationComplete(userId);

      if (!migrationComplete) {
        // Attempt migration from local storage to Appwrite
        const legacyData = await this.getLegacyStreakData(userId);
        if (legacyData) {
          await AppwriteStreakService.migrateLocalStreakData(userId, legacyData);
        }
        await this.markMigrationComplete(userId);
      }

      // Get data from Appwrite
      const appwriteData = await AppwriteStreakService.getStreakData(userId);
      return this.convertAppwriteToLegacy(appwriteData);
    } catch (error) {
      console.error('Error getting streak data, falling back to legacy:', error);

      // Fallback to legacy local storage if Appwrite fails
      const legacyData = await this.getLegacyStreakData(userId);
      if (legacyData) {
        return legacyData;
      }

      // Return default if nothing exists
      const now = new Date().toISOString();
      return {
        currentStreak: 0,
        totalStreak: 0,
        lastLoginDate: '',
        streakStartDate: now,
        loginHistory: [],
      };
    }
  }

  // Save streak data - now deprecated, data is automatically saved to Appwrite
  async saveStreakData(userId: string, streakData: StreakData): Promise<void> {
    // This method is kept for backward compatibility but doesn't do anything
    // as Appwrite handles data persistence automatically
    console.warn('saveStreakData is deprecated - data is automatically saved to Appwrite');
  }

  // Update streak when user logs in - now uses Appwrite
  async updateStreakOnLogin(userId: string): Promise<StreakData> {
    try {
      const appwriteData = await AppwriteStreakService.updateStreakOnLogin(userId);
      return this.convertAppwriteToLegacy(appwriteData);
    } catch (error) {
      console.error('Error updating streak on login:', error);
      throw error;
    }
  }

  // Get the current streak for a user
  async getCurrentStreak(userId: string): Promise<number> {
    try {
      return await AppwriteStreakService.getCurrentStreak(userId);
    } catch (error) {
      console.error('Error getting current streak:', error);
      return 0;
    }
  }

  // Get the total streak for a user
  async getTotalStreak(userId: string): Promise<number> {
    try {
      return await AppwriteStreakService.getTotalLoginDays(userId);
    } catch (error) {
      console.error('Error getting total streak:', error);
      return 0;
    }
  }

  // Check if user has logged in today
  async hasLoggedInToday(userId: string): Promise<boolean> {
    try {
      return await AppwriteStreakService.hasLoggedInToday(userId);
    } catch (error) {
      console.error('Error checking today login:', error);
      return false;
    }
  }

  // Get weekly streak (Sunday to Saturday)
  async getWeeklyStreak(userId: string): Promise<number> {
    try {
      return await AppwriteStreakService.getWeeklyStreak(userId);
    } catch (error) {
      console.error('Error getting weekly streak:', error);
      return 0;
    }
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
      // Clear both Appwrite and local storage
      await AppwriteStreakService.clearStreakData(userId);

      // Clear legacy local storage
      const key = `${StreakService.STREAK_STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(key);

      // Clear migration flag so data can be re-migrated if needed
      const migrationKey = `${StreakService.MIGRATION_COMPLETE_KEY}_${userId}`;
      await AsyncStorage.removeItem(migrationKey);
    } catch (error) {
      console.error('Error clearing streak data:', error);
    }
  }

  // Get streak statistics for display
  async getStreakStats(userId: string): Promise<{
    currentStreak: number;
    totalStreak: number;
    streakStartDate: string;
    weeklyStreak?: number;
    longestStreak?: number;
  }> {
    try {
      const stats = await AppwriteStreakService.getStreakStats(userId);
      return {
        currentStreak: stats.currentStreak,
        totalStreak: stats.totalLoginDays, // Map to legacy field name
        streakStartDate: stats.streakStartDate,
        weeklyStreak: stats.weeklyStreak,
        longestStreak: stats.longestStreak,
      };
    } catch (error) {
      console.error('Error getting streak stats:', error);
      const streakData = await this.getStreakData(userId);
      return {
        currentStreak: streakData.currentStreak,
        totalStreak: streakData.totalStreak,
        streakStartDate: streakData.streakStartDate,
      };
    }
  }
}

export default new StreakService();