import { databases, DB_ID, COLLECTIONS } from './appwrite';
import { backendApi } from './backendApi';
import cachedBackendApi from './cachedBackendApi';
import { User, BackendSubmitLevelResponse } from '../types';

/**
 * Level Progress Service
 * Handles tracking user's progress through levels and sections
 */
class LevelProgressService {
  /**
   * Update user's current level and section in Appwrite
   * @param userId - User's Appwrite document ID
   * @param levelId - Backend level UUID
   * @param sectionId - Backend section UUID (optional)
   */
  async updateCurrentLevel(
    userId: string,
    levelId: string,
    sectionId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        currentLevelId: levelId,
        updatedAt: new Date().toISOString(),
      };

      if (sectionId) {
        updateData.currentSectionId = sectionId;
      }

      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, updateData);
    } catch (error) {
      console.error('Update current level error:', error);
      throw error;
    }
  }

  /**
   * Get user's current level ID
   * @param userId - User's Appwrite document ID
   * @returns Current level ID or null
   */
  async getCurrentLevelId(userId: string): Promise<string | null> {
    try {
      const userDoc = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      return userDoc.currentLevelId || null;
    } catch (error) {
      console.error('Get current level ID error:', error);
      return null;
    }
  }

  /**
   * Submit quiz results and update progress
   * @param userId - User's Appwrite document ID
   * @param levelId - Backend level UUID
   * @param score - Quiz score as percentage (0-100)
   * @param timeSpentMinutes - Time spent on the level
   * @param questionsCorrect - Number of correct answers
   * @param totalQuestions - Total number of questions
   * @returns Backend response with next level info
   */
  async submitLevelProgress(
    userId: string,
    levelId: string,
    score: number,
    timeSpentMinutes: number,
    questionsCorrect: number,
    totalQuestions: number,
    xpEarned?: number          // caller-provided; falls back to score-based formula
  ): Promise<BackendSubmitLevelResponse & { writtenXP: { xp: number; monthlyXP: number; totalXP: number } }> {
    try {
      // Submit to backend API
      const backendResponse = await backendApi.submitLevelResults(
        userId,
        levelId,
        score,
        timeSpentMinutes
      );

      // Use caller-provided XP (accumulated per-question) or fallback formula
      const xpToAdd = xpEarned ?? (50 + Math.floor((score / 100) * 50));

      // Read fresh Appwrite data – avoids using stale Redux values
      const userDoc = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);

      const newTotalQuestions = (userDoc.totalQuestionsAnswered || 0) + totalQuestions;
      const newCorrectAnswers = (userDoc.correctAnswers || 0) + questionsCorrect;
      const newXP       = (userDoc.xp       || 0) + xpToAdd;
      const newMonthlyXP = (userDoc.monthlyXP || 0) + xpToAdd;
      const newTotalXP   = (userDoc.totalXP   || 0) + xpToAdd;

      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

      const updateData: any = {
        totalQuestionsAnswered: newTotalQuestions,
        correctAnswers: newCorrectAnswers,
        xp: newXP,
        monthlyXP: newMonthlyXP,
        totalXP: newTotalXP,
        // Stamp the reset key so shouldResetMonthlyXP won't re-trigger after this write
        lastMonthlyReset: userDoc.lastMonthlyReset || currentMonthKey,
        updatedAt: now.toISOString(),
      };

      // If level passed, update current level
      if (backendResponse.passed && backendResponse.next_level_id) {
        updateData.currentLevelId = backendResponse.next_level_id;
      }

      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, updateData);

      return {
        ...backendResponse,
        writtenXP: { xp: newXP, monthlyXP: newMonthlyXP, totalXP: newTotalXP },
      };
    } catch (error) {
      console.error('Submit level progress error:', error);
      throw error;
    }
  }

  /**
   * Get user's progress for a specific level from backend
   * @param userId - User's Appwrite document ID
   * @param levelId - Backend level UUID
   */
  async getUserProgress(userId: string, levelId: string) {
    try {
      return await backendApi.getUserLevelProgress(userId, levelId);
    } catch (error) {
      console.error('Get user progress error:', error);
      return null;
    }
  }

  /**
   * Check if user has completed a level
   * @param userId - User's Appwrite document ID
   * @param levelId - Backend level UUID
   * @returns True if level is completed
   */
  async hasCompletedLevel(userId: string, levelId: string): Promise<boolean> {
    try {
      const progress = await this.getUserProgress(userId, levelId);
      return progress?.status === 'completed';
    } catch (error) {
      console.error('Check level completion error:', error);
      return false;
    }
  }

  /**
   * Get the next level in sequence
   * @param currentLevelId - Current level UUID
   * @param sectionId - Current section UUID
   * @returns Next level details or null if at end
   */
  async getNextLevel(currentLevelId: string, sectionId: string) {
    try {
      // Get all levels in the section with caching
      const levels = await cachedBackendApi.getLevels(sectionId);
      
      // Find current level index
      const currentIndex = levels.findIndex(l => l.level_id === currentLevelId);
      
      if (currentIndex === -1 || currentIndex === levels.length - 1) {
        // Current level not found or it's the last level
        return null;
      }

      // Return next level
      return levels[currentIndex + 1];
    } catch (error) {
      console.error('Get next level error:', error);
      return null;
    }
  }

  /**
   * Initialize user progress with first level
   * @param userId - User's Appwrite document ID
   * @param sectionId - Section UUID to start with
   */
  async initializeProgress(userId: string, sectionId: string): Promise<void> {
    try {
      // Get first level in section with caching
      const levels = await cachedBackendApi.getLevels(sectionId);
      
      if (levels.length === 0) {
        throw new Error('No levels found in section');
      }

      const firstLevel = levels[0];
      await this.updateCurrentLevel(userId, firstLevel.level_id, sectionId);
    } catch (error) {
      console.error('Initialize progress error:', error);
      throw error;
    }
  }

  /**
   * Reset user's monthly XP (should be called at start of each month)
   * @param userId - User's Appwrite document ID
   */
  async resetMonthlyXP(userId: string): Promise<void> {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        monthlyXP: 0,
        lastMonthlyReset: monthKey,
        updatedAt: now.toISOString(),
      });
    } catch (error) {
      console.error('Reset monthly XP error:', error);
      throw error;
    }
  }

  /**
   * Check if user's monthly XP should be reset
   * @param user - User object
   * @returns True if reset is needed
   */
  shouldResetMonthlyXP(user: User): boolean {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    // Reset if never reset before, or if it was reset in a previous month
    return !user.lastMonthlyReset || user.lastMonthlyReset !== currentMonthKey;
  }

  /**
   * Add XP to user (for correct answers, achievements, etc.)
   * @param userId - User's Appwrite document ID
   * @param xpAmount - Amount of XP to add
   */
  async addXP(userId: string, xpAmount: number): Promise<void> {
    try {
      const userDoc = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      
      const newXP = (userDoc.xp || 0) + xpAmount;
      const newMonthlyXP = (userDoc.monthlyXP || 0) + xpAmount;
      const newTotalXP = (userDoc.totalXP || 0) + xpAmount;

      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        xp: newXP,
        monthlyXP: newMonthlyXP,
        totalXP: newTotalXP,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Add XP error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const levelProgressService = new LevelProgressService();
export default levelProgressService;
