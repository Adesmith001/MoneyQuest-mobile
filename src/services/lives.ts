import { databases, DB_ID, COLLECTIONS } from './appwrite';
import { User } from '../types';
import notificationService from './notifications';
import { Platform } from 'react-native';

const MAX_LIVES = 5;
const LIFE_REGEN_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

/**
 * Lives Management Service
 * Handles the lives system: max 5 lives, regenerates 1 every 2 hours
 */
class LivesService {
  /**
   * Calculate current lives based on last regeneration time
   * @param currentLives - Current lives count
   * @param lastRegenTime - ISO timestamp of last regeneration
   * @returns Updated lives count and new regeneration timestamp
   */
  calculateCurrentLives(
    currentLives: number,
    lastRegenTime: string
  ): { lives: number; lastLifeRegenTime: string } {
    // Validate inputs - only default to 5 if undefined/null, NOT if 0
    if (currentLives === null || currentLives === undefined || typeof currentLives !== 'number' || isNaN(currentLives)) {
      currentLives = 5;
    }

    // Ensure currentLives is within valid range (0 is valid!)
    currentLives = Math.max(0, Math.min(currentLives, MAX_LIVES));

    // If already at max lives, no need to calculate
    if (currentLives >= MAX_LIVES) {
      return { lives: MAX_LIVES, lastLifeRegenTime: lastRegenTime || new Date().toISOString() };
    }

    try {
      const lastRegen = new Date(lastRegenTime || new Date()).getTime();
      
      // Validate the parsed date
      if (isNaN(lastRegen)) {
        console.warn('Invalid lastRegenTime, using current time');
        return { lives: currentLives, lastLifeRegenTime: new Date().toISOString() };
      }

      const now = Date.now();
      const timePassed = now - lastRegen;

      // Calculate how many hours have passed
      const hoursPassedFloat = timePassed / LIFE_REGEN_TIME_MS;
      const livesRegened = Math.floor(hoursPassedFloat);

      if (livesRegened === 0) {
        // Not enough time passed for even 1 life
        return { lives: currentLives, lastLifeRegenTime: lastRegenTime };
      }

      // Calculate new lives count (capped at MAX_LIVES)
      const newLives = Math.min(currentLives + livesRegened, MAX_LIVES);

      // Calculate the new last regeneration time
      // This should be the time when the last life was regenerated
      const newLastRegenTime = new Date(lastRegen + livesRegened * LIFE_REGEN_TIME_MS).toISOString();

      return {
        lives: newLives,
        lastLifeRegenTime: newLastRegenTime,
      };
    } catch (error) {
      console.error('Error calculating current lives:', error);
      // Return safe defaults on error
      return { lives: currentLives, lastLifeRegenTime: new Date().toISOString() };
    }
  }

  /**
   * Get time remaining until next life regeneration
   * @param lastRegenTime - ISO timestamp of last regeneration
   * @returns Time remaining in milliseconds, or 0 if at max lives
   */
  getTimeUntilNextLife(currentLives: number, lastRegenTime: string): number {
    if (currentLives >= MAX_LIVES) {
      return 0;
    }

    try {
      const lastRegen = new Date(lastRegenTime || new Date()).getTime();
      
      // Validate the parsed date
      if (isNaN(lastRegen)) {
        console.warn('Invalid lastRegenTime in getTimeUntilNextLife');
        return 0;
      }

      const now = Date.now();
      const nextRegenTime = lastRegen + LIFE_REGEN_TIME_MS;
      const timeRemaining = nextRegenTime - now;

      return Math.max(0, timeRemaining);
    } catch (error) {
      console.error('Error getting time until next life:', error);
      return 0;
    }
  }

  /**
   * Format time remaining as human-readable string
   * @param milliseconds - Time in milliseconds
   * @returns Formatted string like "45m 30s"
   */
  formatTimeRemaining(milliseconds: number): string {
    if (milliseconds === 0) {
      return 'Full';
    }

    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${seconds}s`;
  }

  /**
   * Update user's lives in the database
   * @param userId - User's Appwrite document ID
   * @param lives - New lives count
   * @param lastLifeRegenTime - New regeneration timestamp
   */
  async updateUserLives(
    userId: string,
    lives: number,
    lastLifeRegenTime: string
  ): Promise<void> {
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        lives: lives,
        lastLifeRegenTime: lastLifeRegenTime,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update user lives error:', error);
      throw error;
    }
  }

  /**
   * Deduct a life from the user (when answering a question incorrectly)
   * @param userId - User's Appwrite document ID
   * @param currentLives - Current lives count
   * @param lastRegenTime - Last regeneration timestamp
   * @returns Updated lives info
   */
  async deductLife(
    userId: string,
    currentLives: number,
    lastRegenTime: string
  ): Promise<{ lives: number; lastLifeRegenTime: string; canContinue: boolean }> {
    // First, calculate if any lives have regenerated
    const { lives: updatedLives, lastLifeRegenTime } = this.calculateCurrentLives(
      currentLives,
      lastRegenTime
    );

    if (updatedLives === 0) {
      // No lives to deduct
      return {
        lives: 0,
        lastLifeRegenTime: lastLifeRegenTime,
        canContinue: false,
      };
    }

    // Deduct one life
    const newLives = updatedLives - 1;

    // Update in database
    await this.updateUserLives(userId, newLives, lastLifeRegenTime);

    return {
      lives: newLives,
      lastLifeRegenTime: lastLifeRegenTime,
      canContinue: newLives > 0,
    };
  }

  /**
   * Get updated lives without deducting (for UI updates)
   * @param userId - User's Appwrite document ID
   * @param currentLives - Current lives count
   * @param lastRegenTime - Last regeneration timestamp
   * @returns Updated lives info
   */
  async refreshLives(
    userId: string,
    currentLives: number,
    lastRegenTime: string
  ): Promise<{ lives: number; lastLifeRegenTime: string }> {
    const { lives, lastLifeRegenTime } = this.calculateCurrentLives(
      currentLives,
      lastRegenTime
    );

    // Update database if lives have changed OR if enough time has passed for potential regen
    const timeUntilNext = this.getTimeUntilNextLife(lives, lastLifeRegenTime);
    const shouldUpdate = lives !== currentLives || (timeUntilNext === 0 && lives < MAX_LIVES);

    if (shouldUpdate) {
      await this.updateUserLives(userId, lives, lastLifeRegenTime);

      // 🔔 Schedule notification when lives reach max (wrap in try-catch for iOS safety)
      if (lives === MAX_LIVES && currentLives < MAX_LIVES) {
        // Optionally notify immediately that lives are full
        try {
          await notificationService.sendImmediateNotification(
            '💚 Lives Restored!',
            'Your lives are full! Time to continue your financial learning journey.',
            'lives-notifications'
          );
        } catch (error) {
          console.warn('Failed to send lives notification (non-fatal):', error);
        }
      }

      // 🔔 Schedule notification for next life if not at max (wrap in try-catch for iOS safety)
      if (lives < MAX_LIVES) {
        const timeUntilNextLife = this.getTimeUntilNextLife(lives, lastLifeRegenTime);
        try {
          await notificationService.scheduleLifeFullNotification(timeUntilNextLife);
        } catch (error) {
          console.warn('Failed to schedule life notification (non-fatal):', error);
        }
      }
    }

    return { lives, lastLifeRegenTime };
  }

  /**
   * Check if user has lives remaining
   * @param currentLives - Current lives count
   * @param lastRegenTime - Last regeneration timestamp
   * @returns True if user has at least 1 life
   */
  hasLivesRemaining(currentLives: number, lastRegenTime: string): boolean {
    const { lives } = this.calculateCurrentLives(currentLives, lastRegenTime);
    return lives > 0;
  }

  /**
   * Get lives percentage for UI display
   * @param currentLives - Current lives count
   * @returns Percentage (0-100)
   */
  getLivesPercentage(currentLives: number): number {
    return (currentLives / MAX_LIVES) * 100;
  }

  /**
   * Get max lives constant
   */
  getMaxLives(): number {
    return MAX_LIVES;
  }

  /**
   * Get life regeneration time in milliseconds
   */
  getLifeRegenTimeMs(): number {
    return LIFE_REGEN_TIME_MS;
  }
}

// Export singleton instance
export const livesService = new LivesService();
export default livesService;
