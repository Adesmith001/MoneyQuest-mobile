import { databases, DB_ID, Query, COLLECTIONS } from './appwrite';
import { ID } from 'react-native-appwrite';

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    totalLoginDays: number;
    lastLoginDate: string;
    streakStartDate: string;
    loginHistory: string[]; // Array of YYYY-MM-DD strings
    weeklyStreak: number; // Sunday to Saturday tracking
}

export interface StreakDocument {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    userId: string;
    currentStreak: number;
    longestStreak: number;
    totalLoginDays: number;
    lastLoginDate: string;
    streakStartDate: string;
    loginHistory: string[];
    weeklyStreak: number;
    weekStartDate: string; // Start of current week (Sunday)
}

class AppwriteStreakService {
    private static readonly STREAKS_COLLECTION_ID = COLLECTIONS.STREAKS || 'streaks';

    /**
     * Get or create streak document for a user
     */
    private async getOrCreateStreakDocument(userId: string): Promise<StreakDocument> {
        try {
            // Try to get existing streak document
            const result = await databases.listDocuments(
                DB_ID,
                AppwriteStreakService.STREAKS_COLLECTION_ID,
                [Query.equal('userId', userId), Query.limit(1)]
            );

            if (result.documents.length > 0) {
                return result.documents[0] as unknown as StreakDocument;
            }

            // Create new streak document if none exists
            const now = new Date().toISOString();
            const newStreak = await databases.createDocument(
                DB_ID,
                AppwriteStreakService.STREAKS_COLLECTION_ID,
                ID.unique(),
                {
                    userId,
                    currentStreak: 0,
                    longestStreak: 0,
                    totalLoginDays: 0,
                    lastLoginDate: '',
                    streakStartDate: now,
                    loginHistory: [],
                    weeklyStreak: 0,
                    weekStartDate: this.getWeekStart(new Date()).toISOString(),
                }
            );

            return newStreak as unknown as StreakDocument;
        } catch (error) {
            console.error('Error getting or creating streak document:', error);
            throw error;
        }
    }

    /**
     * Get the start of the week (Sunday)
     */
    private getWeekStart(date: Date): Date {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }

    /**
     * Get date string in YYYY-MM-DD format
     */
    private getDateString(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Check if two dates are consecutive days
     */
    private areConsecutiveDays(date1: Date, date2: Date): boolean {
        const diff = Math.abs(date2.getTime() - date1.getTime());
        const dayInMs = 24 * 60 * 60 * 1000;
        return Math.round(diff / dayInMs) === 1;
    }

    /**
     * Check if a date is in the current week (Sunday to Saturday)
     */
    private isInCurrentWeek(date: Date, weekStartDate: Date): boolean {
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);
        weekEndDate.setHours(23, 59, 59, 999);

        return date >= weekStartDate && date <= weekEndDate;
    }

    /**
     * Update streak when user logs in
     */
    async updateStreakOnLogin(userId: string): Promise<StreakData> {
        try {
            const streakDoc = await this.getOrCreateStreakDocument(userId);
            const now = new Date();
            const today = this.getDateString(now);

            // Check if user already logged in today
            if (streakDoc.loginHistory.includes(today)) {
                return this.convertToStreakData(streakDoc);
            }

            const lastLogin = streakDoc.lastLoginDate ? new Date(streakDoc.lastLoginDate) : null;
            const currentWeekStart = this.getWeekStart(now);
            const docWeekStart = new Date(streakDoc.weekStartDate);

            let newCurrentStreak = streakDoc.currentStreak;
            let newWeeklyStreak = streakDoc.weeklyStreak;
            let newWeekStartDate = streakDoc.weekStartDate;

            // Check if we need to reset weekly streak (new week started)
            if (currentWeekStart.getTime() !== docWeekStart.getTime()) {
                newWeeklyStreak = 0;
                newWeekStartDate = currentWeekStart.toISOString();
            }

            // Calculate daily streak
            if (lastLogin) {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);

                if (this.areConsecutiveDays(lastLogin, now)) {
                    // Consecutive login - increment streak
                    newCurrentStreak += 1;
                } else if (this.getDateString(lastLogin) !== today) {
                    // Streak broken - reset to 1
                    newCurrentStreak = 1;
                }
            } else {
                // First login ever
                newCurrentStreak = 1;
            }

            // Increment weekly streak if in current week
            if (this.isInCurrentWeek(now, currentWeekStart)) {
                newWeeklyStreak += 1;
            }

            // Update login history (keep last 30 days to prevent bloat)
            const updatedHistory = [...streakDoc.loginHistory, today];
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 29);
            const cleanedHistory = updatedHistory.filter(
                dateStr => new Date(dateStr) >= thirtyDaysAgo
            );

            // Calculate new longest streak
            const newLongestStreak = Math.max(streakDoc.longestStreak, newCurrentStreak);

            // Update the document
            const updatedDoc = await databases.updateDocument(
                DB_ID,
                AppwriteStreakService.STREAKS_COLLECTION_ID,
                streakDoc.$id,
                {
                    currentStreak: newCurrentStreak,
                    longestStreak: newLongestStreak,
                    totalLoginDays: streakDoc.totalLoginDays + 1,
                    lastLoginDate: now.toISOString(),
                    streakStartDate: newCurrentStreak === 1 ? now.toISOString() : streakDoc.streakStartDate,
                    loginHistory: cleanedHistory,
                    weeklyStreak: newWeeklyStreak,
                    weekStartDate: newWeekStartDate,
                }
            );

            return this.convertToStreakData(updatedDoc as unknown as StreakDocument);
        } catch (error) {
            console.error('Error updating streak on login:', error);
            throw error;
        }
    }

    /**
     * Get streak data for a user
     */
    async getStreakData(userId: string): Promise<StreakData> {
        try {
            const streakDoc = await this.getOrCreateStreakDocument(userId);
            return this.convertToStreakData(streakDoc);
        } catch (error) {
            console.error('Error getting streak data:', error);
            throw error;
        }
    }

    /**
     * Check if user has logged in today
     */
    async hasLoggedInToday(userId: string): Promise<boolean> {
        try {
            const streakDoc = await this.getOrCreateStreakDocument(userId);
            const today = this.getDateString(new Date());
            return streakDoc.loginHistory.includes(today);
        } catch (error) {
            console.error('Error checking today login:', error);
            return false;
        }
    }

    /**
     * Get current streak for a user
     */
    async getCurrentStreak(userId: string): Promise<number> {
        try {
            const streakData = await this.getStreakData(userId);
            return streakData.currentStreak;
        } catch (error) {
            console.error('Error getting current streak:', error);
            return 0;
        }
    }

    /**
     * Get total login days for a user
     */
    async getTotalLoginDays(userId: string): Promise<number> {
        try {
            const streakData = await this.getStreakData(userId);
            return streakData.totalLoginDays;
        } catch (error) {
            console.error('Error getting total login days:', error);
            return 0;
        }
    }

    /**
     * Get weekly streak (Sunday to Saturday)
     */
    async getWeeklyStreak(userId: string): Promise<number> {
        try {
            const streakData = await this.getStreakData(userId);
            return streakData.weeklyStreak;
        } catch (error) {
            console.error('Error getting weekly streak:', error);
            return 0;
        }
    }

    /**
     * Get streak statistics for display
     */
    async getStreakStats(userId: string): Promise<{
        currentStreak: number;
        longestStreak: number;
        totalLoginDays: number;
        weeklyStreak: number;
        streakStartDate: string;
    }> {
        try {
            const streakData = await this.getStreakData(userId);
            return {
                currentStreak: streakData.currentStreak,
                longestStreak: streakData.longestStreak,
                totalLoginDays: streakData.totalLoginDays,
                weeklyStreak: streakData.weeklyStreak,
                streakStartDate: streakData.streakStartDate,
            };
        } catch (error) {
            console.error('Error getting streak stats:', error);
            return {
                currentStreak: 0,
                longestStreak: 0,
                totalLoginDays: 0,
                weeklyStreak: 0,
                streakStartDate: new Date().toISOString(),
            };
        }
    }

    /**
     * Convert StreakDocument to StreakData
     */
    private convertToStreakData(doc: StreakDocument): StreakData {
        return {
            currentStreak: doc.currentStreak,
            longestStreak: doc.longestStreak,
            totalLoginDays: doc.totalLoginDays,
            lastLoginDate: doc.lastLoginDate,
            streakStartDate: doc.streakStartDate,
            loginHistory: doc.loginHistory,
            weeklyStreak: doc.weeklyStreak,
        };
    }

    /**
     * Clear streak data (for testing or account deletion)
     */
    async clearStreakData(userId: string): Promise<void> {
        try {
            const result = await databases.listDocuments(
                DB_ID,
                AppwriteStreakService.STREAKS_COLLECTION_ID,
                [Query.equal('userId', userId), Query.limit(1)]
            );

            if (result.documents.length > 0) {
                await databases.deleteDocument(
                    DB_ID,
                    AppwriteStreakService.STREAKS_COLLECTION_ID,
                    result.documents[0].$id
                );
            }
        } catch (error) {
            console.error('Error clearing streak data:', error);
            throw error;
        }
    }

    /**
     * Migrate local streak data to Appwrite
     * This method helps transition from the old local storage system
     */
    async migrateLocalStreakData(userId: string, localStreakData: any): Promise<void> {
        try {
            const existingDoc = await this.getOrCreateStreakDocument(userId);

            // Only migrate if the existing document has no data (new user or fresh install)
            if (existingDoc.totalLoginDays === 0 && localStreakData) {
                await databases.updateDocument(
                    DB_ID,
                    AppwriteStreakService.STREAKS_COLLECTION_ID,
                    existingDoc.$id,
                    {
                        currentStreak: localStreakData.currentStreak || 0,
                        longestStreak: localStreakData.currentStreak || 0, // Use current as longest for migration
                        totalLoginDays: localStreakData.totalStreak || 0,
                        lastLoginDate: localStreakData.lastLoginDate || new Date().toISOString(),
                        streakStartDate: localStreakData.streakStartDate || new Date().toISOString(),
                        loginHistory: localStreakData.loginHistory || [],
                        weeklyStreak: 0, // Reset weekly streak during migration
                        weekStartDate: this.getWeekStart(new Date()).toISOString(),
                    }
                );
            }
        } catch (error) {
            console.error('Error migrating local streak data:', error);
            // Don't throw error during migration to avoid blocking user
        }
    }
}

export default new AppwriteStreakService();