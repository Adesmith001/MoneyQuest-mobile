import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  COMPLETED_LEVELS: '@moneyquest_completed_levels',
};

class CacheService {
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
}

// Export a singleton instance
const cacheService = new CacheService();
export default cacheService;
