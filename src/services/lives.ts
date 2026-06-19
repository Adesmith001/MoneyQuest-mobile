import { databases, DB_ID, COLLECTIONS } from './appwrite';
import { getLifeDeductionResult } from '../utils/progressBehavior';

const MAX_LIVES = 5;
const LIFE_REGEN_TIME_MS = 2 * 60 * 60 * 1000;

/**
 * Lives Management Service
 * Handles the lives system: max 5 lives, lost on wrong answers, regenerated over time,
 * and also earned on level completion.
 */
class LivesService {
  /**
   * Clamp stored lives into the valid range and apply timed regeneration.
   */
  calculateCurrentLives(
    currentLives: number,
    lastRegenTime: string
  ): { lives: number; lastLifeRegenTime: string } {
    if (
      currentLives === null ||
      currentLives === undefined ||
      typeof currentLives !== 'number' ||
      isNaN(currentLives)
    ) {
      currentLives = MAX_LIVES;
    }

    const normalizedLives = Math.max(0, Math.min(currentLives, MAX_LIVES));
    const fallbackTime = lastRegenTime || new Date().toISOString();

    if (normalizedLives >= MAX_LIVES) {
      return {
        lives: MAX_LIVES,
        lastLifeRegenTime: fallbackTime,
      };
    }

    const regenStart = new Date(fallbackTime);
    if (Number.isNaN(regenStart.getTime())) {
      return {
        lives: normalizedLives,
        lastLifeRegenTime: new Date().toISOString(),
      };
    }

    const now = Date.now();
    const elapsedMs = Math.max(0, now - regenStart.getTime());
    const regeneratedLives = Math.floor(elapsedMs / LIFE_REGEN_TIME_MS);

    if (regeneratedLives <= 0) {
      return {
        lives: normalizedLives,
        lastLifeRegenTime: fallbackTime,
      };
    }

    const nextLives = Math.min(MAX_LIVES, normalizedLives + regeneratedLives);
    const consumedLives = nextLives - normalizedLives;
    const nextAnchorTime =
      nextLives >= MAX_LIVES
        ? new Date(now).toISOString()
        : new Date(regenStart.getTime() + consumedLives * LIFE_REGEN_TIME_MS).toISOString();

    return {
      lives: nextLives,
      lastLifeRegenTime: nextAnchorTime,
    };
  }

  /**
   * Return the remaining time for the next timed life regeneration.
   */
  getTimeUntilNextLife(currentLives: number, lastRegenTime: string): number {
    const { lives, lastLifeRegenTime } = this.calculateCurrentLives(currentLives, lastRegenTime);

    if (lives >= MAX_LIVES) {
      return 0;
    }

    const anchorTime = new Date(lastLifeRegenTime);
    if (Number.isNaN(anchorTime.getTime())) {
      return LIFE_REGEN_TIME_MS;
    }

    return Math.max(0, anchorTime.getTime() + LIFE_REGEN_TIME_MS - Date.now());
  }

  formatTimeRemaining(milliseconds: number): string {
    if (milliseconds === 0) {
      return 'Life ready now';
    }

    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${remainingMinutes}m`;
    }

    if (minutes === 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${seconds}s`;
  }

  async updateUserLives(
    userId: string,
    lives: number,
    lastLifeRegenTime: string
  ): Promise<void> {
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        lives,
        lastLifeRegenTime,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update user lives error:', error);
      throw error;
    }
  }

  async deductLife(
    userId: string,
    currentLives: number,
    lastRegenTime: string
  ): Promise<{ lives: number; lastLifeRegenTime: string; canContinue: boolean }> {
    try {
      const userDoc = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      currentLives =
        userDoc.lives !== undefined && userDoc.lives !== null ? userDoc.lives : currentLives;
      lastRegenTime = userDoc.lastLifeRegenTime || lastRegenTime;
    } catch (error) {
      console.warn('Falling back to local lives state for deduction:', error);
    }

    const { lives: storedLives, lastLifeRegenTime } = this.calculateCurrentLives(
      currentLives,
      lastRegenTime
    );

    if (storedLives === 0) {
      return {
        lives: 0,
        lastLifeRegenTime,
        canContinue: false,
      };
    }

    const deduction = getLifeDeductionResult(
      storedLives,
      lastLifeRegenTime,
      new Date().toISOString()
    );

    await this.updateUserLives(userId, deduction.lives, deduction.lastLifeRegenTime);

    return {
      lives: deduction.lives,
      lastLifeRegenTime: deduction.lastLifeRegenTime,
      canContinue: deduction.lives > 0,
    };
  }

  async refreshLives(
    userId: string,
    currentLives: number,
    lastRegenTime: string
  ): Promise<{ lives: number; lastLifeRegenTime: string }> {
    const refreshed = this.calculateCurrentLives(currentLives, lastRegenTime);

    if (
      userId &&
      (refreshed.lives !== currentLives || refreshed.lastLifeRegenTime !== lastRegenTime)
    ) {
      try {
        await this.updateUserLives(userId, refreshed.lives, refreshed.lastLifeRegenTime);
      } catch (error) {
        console.warn('Failed to persist refreshed lives:', error);
      }
    }

    return refreshed;
  }

  hasLivesRemaining(currentLives: number, lastRegenTime: string): boolean {
    const { lives } = this.calculateCurrentLives(currentLives, lastRegenTime);
    return lives > 0;
  }

  getLivesPercentage(currentLives: number): number {
    return (Math.max(0, Math.min(currentLives, MAX_LIVES)) / MAX_LIVES) * 100;
  }

  getMaxLives(): number {
    return MAX_LIVES;
  }

  getLifeRegenTimeMs(): number {
    return LIFE_REGEN_TIME_MS;
  }
}

export const livesService = new LivesService();
export default livesService;
