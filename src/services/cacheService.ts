import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendSection, BackendLevel } from '../types';

const SOUND_ENABLED_KEY = '@sound_enabled';

const CACHE_KEYS = {
  COMPLETED_LEVELS: '@moneyquest_completed_levels',
  SECTIONS: '@moneyquest_sections',
  SECTIONS_TIMESTAMP: '@moneyquest_sections_timestamp',
  LEVELS_PREFIX: '@moneyquest_levels_',
  LEVELS_TIMESTAMP_PREFIX: '@moneyquest_levels_timestamp_',
  QUESTIONS_PREFIX: '@moneyquest_questions_',
  QUESTIONS_TIMESTAMP_PREFIX: '@moneyquest_questions_timestamp_',
  LEVEL_DATA_PREFIX: '@moneyquest_level_data_',
  LEVEL_DATA_TIMESTAMP_PREFIX: '@moneyquest_level_data_timestamp_',
  BACKGROUND_REFRESH_DONE: '@moneyquest_bg_refresh_done',
};

// Refresh interval: 7 days in milliseconds
const REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000;

class CacheService {
  private initialized = false;

  /**
   * Initialize cache service
   * Call this on app startup before any cache operations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    console.log('✅ Cache service initialized');
  }

  /**
   * Check if cache has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
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

  // ===== SECTIONS CACHE =====

  /**
   * Get sections from cache
   * @returns Cached sections or null if not found
   */
  async getSections(): Promise<BackendSection[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.SECTIONS);

      if (cached) {
        console.log('✅ Using cached sections');
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Failed to get sections from cache:', error);
      return null;
    }
  }

  /**
   * Save sections to cache (with timestamp)
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
   * Check if sections cache is older than 7 days
   */
  async isSectionsCacheStale(): Promise<boolean> {
    try {
      const timestampStr = await AsyncStorage.getItem(CACHE_KEYS.SECTIONS_TIMESTAMP);
      if (!timestampStr) return true;
      const age = Date.now() - parseInt(timestampStr, 10);
      return age > REFRESH_INTERVAL;
    } catch {
      return true;
    }
  }

  // ===== LEVELS CACHE =====

  /**
   * Get levels for a section from cache
   */
  async getLevels(sectionId: string): Promise<BackendLevel[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.LEVELS_PREFIX + sectionId);

      if (cached) {
        console.log(`✅ Using cached levels for ${sectionId}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Failed to get levels from cache:', error);
      return null;
    }
  }

  /**
   * Save levels to cache (with timestamp)
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
   * Check if levels cache for a section is older than 7 days
   */
  async isLevelsCacheStale(sectionId: string): Promise<boolean> {
    try {
      const timestampStr = await AsyncStorage.getItem(CACHE_KEYS.LEVELS_TIMESTAMP_PREFIX + sectionId);
      if (!timestampStr) return true;
      const age = Date.now() - parseInt(timestampStr, 10);
      return age > REFRESH_INTERVAL;
    } catch {
      return true;
    }
  }

  // ===== QUESTIONS CACHE =====

  /**
   * Get questions for a level from cache
   */
  async getQuestions(levelId: string): Promise<any[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.QUESTIONS_PREFIX + levelId);

      if (cached) {
        console.log(`✅ Using cached questions for ${levelId}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Failed to get questions from cache:', error);
      return null;
    }
  }

  /**
   * Save questions to cache (with timestamp)
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
   * Check if questions cache for a level is older than 7 days
   */
  async isQuestionsCacheStale(levelId: string): Promise<boolean> {
    try {
      const timestampStr = await AsyncStorage.getItem(CACHE_KEYS.QUESTIONS_TIMESTAMP_PREFIX + levelId);
      if (!timestampStr) return true;
      const age = Date.now() - parseInt(timestampStr, 10);
      return age > REFRESH_INTERVAL;
    } catch {
      return true;
    }
  }

  // ===== LEVEL DATA (ARTICLE) CACHE =====

  /**
   * Get level data (article/description) from cache
   */
  async getLevelData(levelId: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.LEVEL_DATA_PREFIX + levelId);

      if (cached) {
        console.log(`✅ Using cached level data for ${levelId}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Failed to get level data from cache:', error);
      return null;
    }
  }

  /**
   * Save level data (article/description) to cache (with timestamp)
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

  // ===== BACKGROUND REFRESH TRACKING =====

  /**
   * Check if a background refresh has already been done this session.
   * We use a session-scoped flag so it only fires once per app open.
   */
  private backgroundRefreshDone = false;

  isBackgroundRefreshDone(): boolean {
    return this.backgroundRefreshDone;
  }

  markBackgroundRefreshDone(): void {
    this.backgroundRefreshDone = true;
  }
}

// Export a singleton instance
const cacheService = new CacheService();
export default cacheService;
