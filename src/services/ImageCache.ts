import * as FileSystem from "expo-file-system";
import { Paths } from "expo-file-system/next";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Image Cache Service
 * Caches images to disk for offline access and faster loading
 */
class ImageCacheService {
  private cacheDir: string;
  private cachedImages: Set<string>;
  private cacheKeyPrefix = "@image_cache:";

  constructor() {
    this.cacheDir = `${Paths.cache.uri}images/`;
    this.cachedImages = new Set<string>();
  }

  /**
   * Initialize the cache directory
   */
  async initialize(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, {
          intermediates: true,
        });
        console.log("📁 Image cache directory created");
      }

      // Load cached image list from AsyncStorage
      const cachedList = await AsyncStorage.getItem(
        `${this.cacheKeyPrefix}list`,
      );
      if (cachedList) {
        this.cachedImages = new Set(JSON.parse(cachedList));
        console.log(`📦 Loaded ${this.cachedImages.size} cached images`);
      }
    } catch (error) {
      console.error("Failed to initialize image cache:", error);
    }
  }

  /**
   * Generate a unique cache filename from URL
   */
  private getCacheFilename(url: string): string {
    // Simple hash function to generate filename from URL
    const hash = url.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    // Extract file extension if available
    const extension = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[1] || "jpg";
    return `${Math.abs(hash)}.${extension}`;
  }

  /**
   * Get cached image URI if available, otherwise return null
   */
  async getCachedImage(url: string): Promise<string | null> {
    const filename = this.getCacheFilename(url);
    const filepath = `${this.cacheDir}${filename}`;

    try {
      const fileInfo = await FileSystem.getInfoAsync(filepath);
      if (fileInfo.exists) {
        return filepath;
      }
    } catch (error) {
      console.error("Error checking cached image:", error);
    }

    return null;
  }

  /**
   * Download and cache an image
   */
  async cacheImage(url: string): Promise<string | null> {
    const filename = this.getCacheFilename(url);
    const filepath = `${this.cacheDir}${filename}`;

    try {
      // Check if already cached
      if (this.cachedImages.has(url)) {
        const fileInfo = await FileSystem.getInfoAsync(filepath);
        if (fileInfo.exists) {
          return filepath;
        }
      }

      // Download image
      const downloadResult = await FileSystem.downloadAsync(url, filepath);

      if (downloadResult.status === 200) {
        // Add to cached list
        this.cachedImages.add(url);
        await this.saveCachedList();

        console.log(`✅ Cached image: ${filename}`);
        return filepath;
      }
    } catch (error) {
      console.error("Error caching image:", error);
    }

    return null;
  }

  /**
   * Save cached images list to AsyncStorage
   */
  private async saveCachedList(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.cacheKeyPrefix}list`,
        JSON.stringify(Array.from(this.cachedImages)),
      );
    } catch (error) {
      console.error("Error saving cached list:", error);
    }
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(this.cacheDir, {
        intermediates: true,
      });

      this.cachedImages.clear();
      await AsyncStorage.removeItem(`${this.cacheKeyPrefix}list`);

      console.log("🗑️ Image cache cleared");
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  /**
   * Get cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(
          `${this.cacheDir}${file}`,
        );
        if (fileInfo.exists && "size" in fileInfo) {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      console.error("Error getting cache size:", error);
      return 0;
    }
  }

  /**
   * Preload critical images on app start
   */
  async preloadCriticalImages(imageUrls: string[]): Promise<void> {
    console.log(`🔄 Preloading ${imageUrls.length} critical images...`);

    const promises = imageUrls.map((url) => this.cacheImage(url));
    await Promise.allSettled(promises);

    console.log("✅ Critical images preloaded");
  }
}

// Export singleton instance
export const imageCache = new ImageCacheService();
export default imageCache;
