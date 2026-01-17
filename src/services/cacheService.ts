import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendSection, BackendLevel } from '../types';

// ⚠️ INCREMENT THIS VERSION whenever you want to invalidate ALL caches
// This forces fresh data fetch when users update the app
const CACHE_VERSION = 3;

const CACHE_KEYS = {
  CACHE_VERSION: '@moneyquest_cache_version',
  COMPLETED_LEVELS: '@moneyquest_completed_levels',
  SECTIONS: '@moneyquest_sections',
  SECTIONS_TIMESTAMP: '@moneyquest_sections_timestamp',
  LEVELS_PREFIX: '@moneyquest_levels_',
  LEVELS_TIMESTAMP_PREFIX: '@moneyquest_levels_timestamp_',
  QUESTIONS_PREFIX: '@moneyquest_questions_',
  QUESTIONS_TIMESTAMP_PREFIX: '@moneyquest_questions_timestamp_',
  LEVEL_DATA_PREFIX: '@moneyquest_level_data_',
  LEVEL_DATA_TIMESTAMP_PREFIX: '@moneyquest_level_data_timestamp_',
};

// Cache duration: 7 days in milliseconds
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

class CacheService {
  private initialized = false;

  /**
   * Initialize cache service and check version
   * Call this on app startup before any cache operations
   * If cache version is outdated, all caches will be cleared
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const storedVersion = await AsyncStorage.getItem(CACHE_KEYS.CACHE_VERSION);
      const currentVersion = storedVersion ? parseInt(storedVersion, 10) : 0;

      if (currentVersion < CACHE_VERSION) {
        console.log(`🔄 Cache version mismatch (stored: ${currentVersion}, required: ${CACHE_VERSION})`);
        console.log('🗑️ Clearing all old caches...');
        await this.clearAllMoneyQuestCaches();
        await AsyncStorage.setItem(CACHE_KEYS.CACHE_VERSION, CACHE_VERSION.toString());
        console.log(`✅ Cache cleared and version updated to ${CACHE_VERSION}`);
      } else {
        console.log(`✅ Cache version ${CACHE_VERSION} is current`);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
      // Still mark as initialized to prevent blocking the app
      this.initialized = true;
    }
  }

  /**
   * Check if cache has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear ALL MoneyQuest cached data (used when cache version changes)
   */
  private async clearAllMoneyQuestCaches(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter only MoneyQuest cache keys (but NOT the version key yet)
      const cacheKeys = allKeys.filter(
        key => key.startsWith('@moneyquest_') && key !== CACHE_KEYS.CACHE_VERSION
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('Failed to clear all caches:', error);
    }
  }

  /**
   * Force reset all caches and update version (for manual refresh)
   */
  async forceResetAllCaches(): Promise<void> {
    await this.clearAllMoneyQuestCaches();
    await AsyncStorage.setItem(CACHE_KEYS.CACHE_VERSION, CACHE_VERSION.toString());
    this.initialized = false;
    console.log('🔄 All caches force reset');
  }

  /**
   * Get all completed level IDs from cache
   * @returns Array of completed level IDs
   */
  async getCompletedLevels(): Promise<string[]> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.COMPLETED_LEVELS);
      if (cached) {
        return JSON.parse(cached);
      }
      return [];
    } catch (error) {
      console.error('Failed to get completed levels from cache:', error);
      return [];
    }
  }

  /**
   * Save completed level IDs to cache
   * @param levels Array of completed level IDs
   */
  async saveCompletedLevels(levels: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.COMPLETED_LEVELS,
        JSON.stringify(levels)
      );
    } catch (error) {
      console.error('Failed to save completed levels to cache:', error);
    }
  }

  /**
   * Add a single completed level to cache
   * @param levelId Level ID to add
   */
  async addCompletedLevel(levelId: string): Promise<void> {
    try {
      const currentLevels = await this.getCompletedLevels();
      
      // Only add if not already in the list
      if (!currentLevels.includes(levelId)) {
        const updatedLevels = [...currentLevels, levelId];
        await this.saveCompletedLevels(updatedLevels);
      }
    } catch (error) {
      console.error('Failed to add completed level to cache:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.COMPLETED_LEVELS);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // ===== SECTIONS CACHE =====

  /**
   * Check if cached data is still valid (within 30 days)
   */
  private isCacheValid(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    return age < CACHE_DURATION;
  }

  /**
   * Get sections from cache
   * @returns Cached sections or null if expired/not found
   */
  async getSections(): Promise<BackendSection[] | null> {
    try {
      const [cached, timestampStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.SECTIONS),
        AsyncStorage.getItem(CACHE_KEYS.SECTIONS_TIMESTAMP),
      ]);

      if (cached && timestampStr) {
        const timestamp = parseInt(timestampStr, 10);
        if (this.isCacheValid(timestamp)) {
          const age = Date.now() - timestamp;
          const daysOld = Math.floor(age / (24 * 60 * 60 * 1000));
          console.log(`✅ Using cached sections (${daysOld} days old)`);
          return JSON.parse(cached);
        } else {
          console.log('❌ Sections cache expired (>7 days)');
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get sections from cache:', error);
      return null;
    }
  }

  /**
   * Save sections to cache
   */
  async saveSections(sections: BackendSection[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEYS.SECTIONS, JSON.stringify(sections)),
        AsyncStorage.setItem(CACHE_KEYS.SECTIONS_TIMESTAMP, Date.now().toString()),
      ]);
      console.log('💾 Sections saved to cache');
    } catch (error) {
      console.error('Failed to save sections to cache:', error);
    }
  }

  /**
   * Invalidate sections cache (force refetch on next request)
   */
  async invalidateSections(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.SECTIONS),
        AsyncStorage.removeItem(CACHE_KEYS.SECTIONS_TIMESTAMP),
      ]);
      console.log('🗑️ Sections cache invalidated');
    } catch (error) {
      console.error('Failed to invalidate sections cache:', error);
    }
  }

  // ===== LEVELS CACHE =====

  /**
   * Get levels for a section from cache
   */
  async getLevels(sectionId: string): Promise<BackendLevel[] | null> {
    try {
      const [cached, timestampStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.LEVELS_PREFIX + sectionId),
        AsyncStorage.getItem(CACHE_KEYS.LEVELS_TIMESTAMP_PREFIX + sectionId),
      ]);

      if (cached && timestampStr) {
        const timestamp = parseInt(timestampStr, 10);
        if (this.isCacheValid(timestamp)) {
          const age = Date.now() - timestamp;
          const daysOld = Math.floor(age / (24 * 60 * 60 * 1000));
          console.log(`✅ Using cached levels for ${sectionId} (${daysOld} days old)`);
          return JSON.parse(cached);
        } else {
          console.log(`❌ Levels cache for ${sectionId} expired (>7 days)`);
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get levels from cache:', error);
      return null;
    }
  }

  /**
   * Save levels to cache
   */
  async saveLevels(sectionId: string, levels: BackendLevel[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEYS.LEVELS_PREFIX + sectionId, JSON.stringify(levels)),
        AsyncStorage.setItem(CACHE_KEYS.LEVELS_TIMESTAMP_PREFIX + sectionId, Date.now().toString()),
      ]);
      console.log(`💾 Levels for ${sectionId} saved to cache`);
    } catch (error) {
      console.error('Failed to save levels to cache:', error);
    }
  }

  /**
   * Invalidate levels cache for a specific section
   */
  async invalidateLevels(sectionId: string): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.LEVELS_PREFIX + sectionId),
        AsyncStorage.removeItem(CACHE_KEYS.LEVELS_TIMESTAMP_PREFIX + sectionId),
      ]);
      console.log(`🗑️ Levels cache for ${sectionId} invalidated`);
    } catch (error) {
      console.error('Failed to invalidate levels cache:', error);
    }
  }

  // ===== QUESTIONS CACHE =====

  /**
   * Get questions for a level from cache
   */
  async getQuestions(levelId: string): Promise<any[] | null> {
    try {
      const [cached, timestampStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.QUESTIONS_PREFIX + levelId),
        AsyncStorage.getItem(CACHE_KEYS.QUESTIONS_TIMESTAMP_PREFIX + levelId),
      ]);

      if (cached && timestampStr) {
        const timestamp = parseInt(timestampStr, 10);
        if (this.isCacheValid(timestamp)) {
          const age = Date.now() - timestamp;
          const daysOld = Math.floor(age / (24 * 60 * 60 * 1000));
          console.log(`✅ Using cached questions for ${levelId} (${daysOld} days old)`);
          return JSON.parse(cached);
        } else {
          console.log(`❌ Questions cache for ${levelId} expired (>7 days)`);
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get questions from cache:', error);
      return null;
    }
  }

  /**
   * Save questions to cache
   */
  async saveQuestions(levelId: string, questions: any[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEYS.QUESTIONS_PREFIX + levelId, JSON.stringify(questions)),
        AsyncStorage.setItem(CACHE_KEYS.QUESTIONS_TIMESTAMP_PREFIX + levelId, Date.now().toString()),
      ]);
      console.log(`💾 Questions for ${levelId} saved to cache`);
    } catch (error) {
      console.error('Failed to save questions to cache:', error);
    }
  }

  /**
   * Invalidate questions cache for a specific level
   */
  async invalidateQuestions(levelId: string): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.QUESTIONS_PREFIX + levelId),
        AsyncStorage.removeItem(CACHE_KEYS.QUESTIONS_TIMESTAMP_PREFIX + levelId),
      ]);
      console.log(`🗑️ Questions cache for ${levelId} invalidated`);
    } catch (error) {
      console.error('Failed to invalidate questions cache:', error);
    }
  }

  // ===== LEVEL DATA (ARTICLE) CACHE =====

  /**
   * Get level data (article/description) from cache
   */
  async getLevelData(levelId: string): Promise<any | null> {
    try {
      const [cached, timestampStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.LEVEL_DATA_PREFIX + levelId),
        AsyncStorage.getItem(CACHE_KEYS.LEVEL_DATA_TIMESTAMP_PREFIX + levelId),
      ]);

      if (cached && timestampStr) {
        const timestamp = parseInt(timestampStr, 10);
        if (this.isCacheValid(timestamp)) {
          const age = Date.now() - timestamp;
          const daysOld = Math.floor(age / (24 * 60 * 60 * 1000));
          console.log(`✅ Using cached level data for ${levelId} (${daysOld} days old)`);
          return JSON.parse(cached);
        } else {
          console.log(`❌ Level data cache for ${levelId} expired (>7 days)`);
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get level data from cache:', error);
      return null;
    }
  }

  /**
   * Save level data (article/description) to cache
   */
  async saveLevelData(levelId: string, levelData: any): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEYS.LEVEL_DATA_PREFIX + levelId, JSON.stringify(levelData)),
        AsyncStorage.setItem(CACHE_KEYS.LEVEL_DATA_TIMESTAMP_PREFIX + levelId, Date.now().toString()),
      ]);
      console.log(`💾 Level data for ${levelId} saved to cache`);
    } catch (error) {
      console.error('Failed to save level data to cache:', error);
    }
  }

  /**
   * Invalidate level data cache for a specific level
   */
  async invalidateLevelData(levelId: string): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.LEVEL_DATA_PREFIX + levelId),
        AsyncStorage.removeItem(CACHE_KEYS.LEVEL_DATA_TIMESTAMP_PREFIX + levelId),
      ]);
      console.log(`🗑️ Level data cache for ${levelId} invalidated`);
    } catch (error) {
      console.error('Failed to invalidate level data cache:', error);
    }
  }

  /**
   * Clear all learning content caches (sections, levels, questions, level data)
   */
  async clearLearningCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const learningKeys = allKeys.filter(
        key =>
          key.startsWith(CACHE_KEYS.SECTIONS) ||
          key.startsWith(CACHE_KEYS.LEVELS_PREFIX) ||
          key.startsWith(CACHE_KEYS.QUESTIONS_PREFIX) ||
          key.startsWith(CACHE_KEYS.LEVEL_DATA_PREFIX)
      );
      
      if (learningKeys.length > 0) {
        await AsyncStorage.multiRemove(learningKeys);
        console.log(`🗑️ Cleared ${learningKeys.length} learning cache items`);
      }
    } catch (error) {
      console.error('Failed to clear learning cache:', error);
    }
  }
}

// Export a singleton instance
const cacheService = new CacheService();
export default cacheService;
