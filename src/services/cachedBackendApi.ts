import { store } from '../store';
import {
  setSections,
  setSectionsLoading,
  setLevels,
  selectSections,
  selectLevels,
} from '../store/slices/learningSlice';
import backendApi from './backendApi';
import cacheService from './cacheService';
import { BackendSection, BackendLevel } from '../types';

/**
 * Cached Backend API Service
 * Implements a 3-tier caching strategy:
 * 1. Redux store (fastest, in-memory, persisted via redux-persist)
 * 2. AsyncStorage (persistent, offline backup)
 * 3. Backend API (authoritative source)
 * 
 * Refresh strategy:
 * - Serve cached data instantly on every session
 * - Once per session, check if cache is >7 days old
 * - If stale, silently fetch fresh data in the background
 * - Fresh data is written to AsyncStorage only (not Redux)
 * - User sees updated content on their NEXT session
 * 
 * IMPORTANT: Redux state is persisted and rehydrated on app start.
 * Data should only be fetched from API when cache is missing,
 * or silently refreshed in background when stale.
 */
class CachedBackendApiService {
  // Track if we've already fetched during this session to avoid duplicate calls
  private sessionFetchedSections = false;
  private sessionFetchedLevels = new Set<string>();
  private sessionFetchedQuestions = new Set<string>();
  private cacheInitialized = false;
  private backgroundRefreshRunning = false;

  /**
   * Initialize the cache system
   * Should be called early in app startup, before any data fetching
   */
  async initializeCache(): Promise<void> {
    if (this.cacheInitialized) return;

    try {
      // Initialize cache service
      await cacheService.initialize();
      this.cacheInitialized = true;
    } catch (error) {
      console.error('Failed to initialize cache:', error);
      this.cacheInitialized = true; // Continue anyway
    }
  }

  /**
   * Reset session tracking (useful when user logs out or cache is cleared)
   */
  resetSessionTracking() {
    this.sessionFetchedSections = false;
    this.sessionFetchedLevels.clear();
    this.sessionFetchedQuestions.clear();
  }

  /**
   * Get sections with caching
   * Priority: Redux (persisted) -> AsyncStorage -> API
   * Will NOT call API if valid cache exists.
   * Triggers a silent background refresh if cache is >7 days old.
   */
  async getSections(): Promise<BackendSection[]> {
    // Ensure cache is initialized first
    await this.initializeCache();

    const state = store.getState();
    
    // 1. Try Redux store first (fastest, already rehydrated from persistence)
    const reduxCached = selectSections(state);
    if (reduxCached && reduxCached.length > 0) {
      // Kick off silent background refresh if stale (fire-and-forget)
      this.triggerBackgroundRefreshIfNeeded();
      return reduxCached;
    }

    // 2. Try AsyncStorage cache (backup)
    const asyncCached = await cacheService.getSections();
    if (asyncCached && asyncCached.length > 0) {
      // Sync to Redux store for faster access
      store.dispatch(setSections(asyncCached));
      // Kick off silent background refresh if stale
      this.triggerBackgroundRefreshIfNeeded();
      return asyncCached;
    }

    // 3. Only fetch from API if we don't have any cached data
    // Also check if we've already fetched this session to prevent duplicate calls
    if (this.sessionFetchedSections) {
      return [];
    }
    this.sessionFetchedSections = true;
    store.dispatch(setSectionsLoading(true));
    
    try {
      const sections = await backendApi.getSections();
      
      // If API returned empty, allow retry on next call
      if (!sections || sections.length === 0) {
        store.dispatch(setSectionsLoading(false));
        this.sessionFetchedSections = false;
        return [];
      }

      // Save to both caches for persistence
      store.dispatch(setSections(sections));
      await cacheService.saveSections(sections);
      return sections;
    } catch (error) {
      store.dispatch(setSectionsLoading(false));
      this.sessionFetchedSections = false; // Allow retry on error
      throw error;
    }
  }

  /**
   * Get levels for a section with caching
   * Priority: Redux (persisted) -> AsyncStorage -> API
   * Will NOT call API if valid cache exists
   */
  async getLevels(sectionId: string): Promise<BackendLevel[]> {
    // Ensure cache is initialized first
    await this.initializeCache();

    const state = store.getState();
    
    // 1. Try Redux store first (fastest, already rehydrated from persistence)
    const reduxCached = selectLevels(sectionId)(state);
    if (reduxCached && reduxCached.length > 0) {
      return reduxCached;
    }

    // 2. Try AsyncStorage cache (backup)
    const asyncCached = await cacheService.getLevels(sectionId);
    if (asyncCached && asyncCached.length > 0) {
      // Sync to Redux store for faster access
      store.dispatch(setLevels({ sectionId, levels: asyncCached }));
      return asyncCached;
    }

    // 3. Only fetch from API if we don't have any cached data
    if (this.sessionFetchedLevels.has(sectionId)) {
      return [];
    }
    this.sessionFetchedLevels.add(sectionId);
    
    try {
      const levels = await backendApi.getSectionLevels(sectionId);
      
      // If API returned empty, allow retry on next call
      if (!levels || levels.length === 0) {
        this.sessionFetchedLevels.delete(sectionId);
        return [];
      }

      // Save to both caches for persistence
      store.dispatch(setLevels({ sectionId, levels }));
      await cacheService.saveLevels(sectionId, levels);
      return levels;
    } catch (error) {
      this.sessionFetchedLevels.delete(sectionId); // Allow retry on error
      throw error;
    }
  }

  /**
   * Get questions for a level with caching
   * Priority: Redux (persisted) -> AsyncStorage -> API
   * Will NOT call API if valid cache exists
   */
  async getQuestions(levelId: string, numQuestions: number = 10, _difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'): Promise<any[]> {
    // Prevent two simultaneous fetches for the same level (e.g. React double-render).
    // Guard is always cleared after the request settles so next call retries fresh.
    if (this.sessionFetchedQuestions.has(levelId)) {
      await new Promise(resolve => setTimeout(resolve, 800));
      this.sessionFetchedQuestions.delete(levelId);
    }

    this.sessionFetchedQuestions.add(levelId);
    try {
      const response = await backendApi.getLevelQuestions(
        levelId,
        numQuestions,
        'mixed',
        true
      );

      const questions = response.questions || [];
      return questions;
    } finally {
      // Always clear so the next navigation retries normally
      this.sessionFetchedQuestions.delete(levelId);
    }
  }

  /**
   * Check if sections are cached (without fetching)
   */
  hasCachedSections(): boolean {
    const state = store.getState();
    const reduxCached = selectSections(state);
    return !!(reduxCached && reduxCached.length > 0);
  }

  /**
   * Check if levels are cached for a section (without fetching)
   */
  hasCachedLevels(sectionId: string): boolean {
    const state = store.getState();
    const reduxCached = selectLevels(sectionId)(state);
    return !!(reduxCached && reduxCached.length > 0);
  }

  /**
   * Questions are always fetched real-time — never cached.
   */
  hasCachedQuestions(_levelId: string): boolean {
    return false;
  }

  // ===== SILENT BACKGROUND REFRESH =====

  /**
   * Trigger a silent background refresh if cache is stale (>7 days).
   * Only runs once per session. Does NOT update Redux — fresh data
   * is written to AsyncStorage and picked up on the next session.
   */
  private triggerBackgroundRefreshIfNeeded(): void {
    // Only run once per session
    if (cacheService.isBackgroundRefreshDone() || this.backgroundRefreshRunning) {
      return;
    }

    // Fire-and-forget — don't await, don't block the UI
    this.performBackgroundRefresh().catch(err => {
      console.warn('🔇 Background refresh failed (non-blocking):', err?.message || err);
    });
  }

  /**
   * Silently fetch fresh data from the API and write to AsyncStorage.
   * Does NOT touch Redux, so the user keeps their current session data.
   * Next time the app opens, it rehydrates from the updated AsyncStorage.
   */
  private async performBackgroundRefresh(): Promise<void> {
    this.backgroundRefreshRunning = true;

    try {
      // Check if sections cache is stale
      const sectionsStale = await cacheService.isSectionsCacheStale();
      if (!sectionsStale) {
        cacheService.markBackgroundRefreshDone();
        this.backgroundRefreshRunning = false;
        return;
      }
      // 1. Fetch fresh sections
      const freshSections = await backendApi.getSections();
      if (freshSections && freshSections.length > 0) {
        await cacheService.saveSections(freshSections);
        // 2. Fetch fresh levels for each section
        for (const section of freshSections) {
          try {
            if (!section.section_id) continue;
            const freshLevels = await backendApi.getSectionLevels(section.section_id);
            if (freshLevels && freshLevels.length > 0) {
              await cacheService.saveLevels(section.section_id, freshLevels);
            }
          } catch (err) {
            // Don't let one section's failure block the rest
            console.warn(`🔇 Background: failed to refresh levels for ${section.section_id}`);
          }
        }
      }
      cacheService.markBackgroundRefreshDone();
    } catch (error) {
      console.warn('🔇 Background refresh error:', error);
    } finally {
      this.backgroundRefreshRunning = false;
    }
  }
}

export const cachedBackendApi = new CachedBackendApiService();
export default cachedBackendApi;
