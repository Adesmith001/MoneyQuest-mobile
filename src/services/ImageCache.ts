/**
 * Image Cache Service
 * 
 * ⚠️ DISABLED: This service has been disabled to prevent iOS crashes
 * caused by deprecated expo-file-system methods (getInfoAsync).
 * 
 * React Native's built-in Image component provides sufficient caching
 * for most use cases. All methods now return no-op values.
 */
class ImageCacheService {
  private cachedImages: Set<string>;
  private cacheKeyPrefix = "@image_cache:";

  constructor() {
    this.cachedImages = new Set<string>();
  }

  /**
   * Initialize the cache directory (DISABLED)
   */
  async initialize(): Promise<void> {
    console.log("⚠️ Image cache disabled to prevent iOS crashes");
    return;
  }

  /**
   * Generate a unique cache filename from URL (DISABLED)
   */
  private getCacheFilename(url: string): string {
    return "";
  }

  /**
   * Get cached image URI if available, otherwise return null (DISABLED)
   */
  async getCachedImage(url: string): Promise<string | null> {
    return null;
  }

  /**
   * Download and cache an image (DISABLED)
   */
  async cacheImage(url: string): Promise<string | null> {
    return null;
  }

  /**
   * Save cached images list to AsyncStorage (DISABLED)
   */
  private async saveCachedList(): Promise<void> {
    return;
  }

  /**
   * Clear all cached images (DISABLED)
   */
  async clearCache(): Promise<void> {
    return;
  }

  /**
   * Get cache size in bytes (DISABLED)
   */
  async getCacheSize(): Promise<number> {
    return 0;
  }

  /**
   * Preload critical images on app start (DISABLED)
   */
  async preloadCriticalImages(imageUrls: string[]): Promise<void> {
    return;
  }
}

// Export singleton instance
export const imageCache = new ImageCacheService();
export default imageCache;
