import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendSection, BackendLevel } from '../types';
import { ENV } from '../config/environment';
import {
  getCompletedLevelsStorageKey,
  LEGACY_COMPLETED_LEVELS_KEY,
} from '../utils/userScopedPersistence';

export const LEARNING_CACHE_VERSION = 2;
const HARD_FALLBACK_CACHE_TTL_MS = 60 * 60 * 1000;

const CACHE_KEYS = {
  SECTIONS: '@moneyquest_sections',
  SECTIONS_TIMESTAMP: '@moneyquest_sections_timestamp',
  LEVELS_PREFIX: '@moneyquest_levels_',
  LEVELS_TIMESTAMP_PREFIX: '@moneyquest_levels_timestamp_',
  QUESTIONS_PREFIX: '@moneyquest_questions_',
  QUESTIONS_TIMESTAMP_PREFIX: '@moneyquest_questions_timestamp_',
  LEARNING_CACHE_VERSION: '@moneyquest_learning_cache_version',
  BACKGROUND_REFRESH_DONE: '@moneyquest_bg_refresh_done',
};

type CacheInitializationResult = {
  cacheVersionBumped: boolean;
};

const getRefreshIntervalMs = (): number => {
  const rawTtlSeconds = ENV.MONEYQUEST_CACHE_TTL_SECONDS;
  const ttlSeconds = Number.parseInt(rawTtlSeconds, 10);

  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return HARD_FALLBACK_CACHE_TTL_MS;
  }

  return ttlSeconds * 1000;
};

class CacheService {
  private initialized = false;

  /**
   * Initialize cache service
   * Call this on app startup before any cache operations
   */
  async initialize(): Promise<CacheInitializationResult> {
    if (this.initialized) {
      return { cacheVersionBumped: false };
    }

    let cacheVersionBumped = false;

    try {
      const storedVersion = await AsyncStorage.getItem(
        CACHE_KEYS.LEARNING_CACHE_VERSION
      );

      if (storedVersion !== String(LEARNING_CACHE_VERSION)) {
        await this.clearLearningPathCache();
        await AsyncStorage.setItem(
          CACHE_KEYS.LEARNING_CACHE_VERSION,
          String(LEARNING_CACHE_VERSION)
        );
        cacheVersionBumped = true;
      }

      await AsyncStorage.removeItem(LEGACY_COMPLETED_LEVELS_KEY);
    } catch (error) {
      console.error('Failed to initialize learning cache version:', error);
    }

    this.initialized = true;
    return { cacheVersionBumped };
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
  async getCompletedLevels(userId: string): Promise<string[]> {
    try {
      const cached = await AsyncStorage.getItem(getCompletedLevelsStorageKey(userId));
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
  async saveCompletedLevels(userId: string, levels: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        getCompletedLevelsStorageKey(userId),
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
  async addCompletedLevel(userId: string, levelId: string): Promise<void> {
    try {
      const currentLevels = await this.getCompletedLevels(userId);
      
      // Only add if not already in the list
      if (!currentLevels.includes(levelId)) {
        const updatedLevels = [...currentLevels, levelId];
        await this.saveCompletedLevels(userId, updatedLevels);
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
    } catch (error) {
      console.error('Failed to save sections to cache:', error);
    }
  }

  /**
   * Check if sections cache is older than 3 days
   */
  async isSectionsCacheStale(): Promise<boolean> {
    try {
      const timestampStr = await AsyncStorage.getItem(CACHE_KEYS.SECTIONS_TIMESTAMP);
      if (!timestampStr) {
        return true;
      }

      const age = Date.now() - parseInt(timestampStr, 10);
      return age > getRefreshIntervalMs();
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
    } catch (error) {
      console.error('Failed to save levels to cache:', error);
    }
  }

  /**
   * Check if levels cache for a section is older than 3 days
   */
  async isLevelsCacheStale(sectionId: string): Promise<boolean> {
    try {
      const timestampStr = await AsyncStorage.getItem(CACHE_KEYS.LEVELS_TIMESTAMP_PREFIX + sectionId);
      if (!timestampStr) {
        return true;
      }

      const age = Date.now() - parseInt(timestampStr, 10);
      return age > getRefreshIntervalMs();
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
    } catch (error) {
      console.error('Failed to save questions to cache:', error);
    }
  }

  /**
   * Check if questions cache for a level is older than 3 days
   */
  async isQuestionsCacheStale(levelId: string): Promise<boolean> {
    try {
      const timestampStr = await AsyncStorage.getItem(CACHE_KEYS.QUESTIONS_TIMESTAMP_PREFIX + levelId);
      if (!timestampStr) {
        return true;
      }

      const age = Date.now() - parseInt(timestampStr, 10);
      return age > getRefreshIntervalMs();
    } catch {
      return true;
    }
  }

  /**
   * Clear persisted learning-path cache keys (sections, levels, and questions)
   * without touching user progress caches like completed levels.
   */
  async clearLearningPathCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const dynamicKeys = allKeys.filter(
        key =>
          key.startsWith(CACHE_KEYS.LEVELS_PREFIX) ||
          key.startsWith(CACHE_KEYS.LEVELS_TIMESTAMP_PREFIX) ||
          key.startsWith(CACHE_KEYS.QUESTIONS_PREFIX) ||
          key.startsWith(CACHE_KEYS.QUESTIONS_TIMESTAMP_PREFIX)
      );

      const staticKeys = [
        CACHE_KEYS.SECTIONS,
        CACHE_KEYS.SECTIONS_TIMESTAMP,
        CACHE_KEYS.BACKGROUND_REFRESH_DONE,
      ];

      const keysToRemove = Array.from(new Set([...staticKeys, ...dynamicKeys]));

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error('Failed to clear learning-path cache:', error);
    }
  }

  /** Persist a complete learning path before pruning the previous fallback. */
  async replaceLearningPathCache(
    sections: BackendSection[],
    levelsBySection: Array<{ sectionId: string; levels: BackendLevel[] }>,
  ): Promise<void> {
    const timestamp = Date.now().toString();
    const entries: [string, string][] = [
      [CACHE_KEYS.SECTIONS, JSON.stringify(sections)],
      [CACHE_KEYS.SECTIONS_TIMESTAMP, timestamp],
    ];

    for (const replacement of levelsBySection) {
      entries.push(
        [CACHE_KEYS.LEVELS_PREFIX + replacement.sectionId, JSON.stringify(replacement.levels)],
        [CACHE_KEYS.LEVELS_TIMESTAMP_PREFIX + replacement.sectionId, timestamp],
      );
    }

    await AsyncStorage.multiSet(entries);

    const retainedKeys = new Set(entries.map(([key]) => key));
    const allKeys = await AsyncStorage.getAllKeys();
    const obsoleteKeys = allKeys.filter(key =>
      !retainedKeys.has(key) && (
        key.startsWith(CACHE_KEYS.LEVELS_PREFIX) ||
        key.startsWith(CACHE_KEYS.LEVELS_TIMESTAMP_PREFIX) ||
        key.startsWith(CACHE_KEYS.QUESTIONS_PREFIX) ||
        key.startsWith(CACHE_KEYS.QUESTIONS_TIMESTAMP_PREFIX)
      )
    );
    if (obsoleteKeys.length > 0) {
      await AsyncStorage.multiRemove(obsoleteKeys);
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
