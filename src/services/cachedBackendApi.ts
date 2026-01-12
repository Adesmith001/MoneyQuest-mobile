import { store } from '../store';
import {
  setSections,
  setSectionsLoading,
  setLevels,
  setQuestions,
  selectSections,
  selectLevels,
  selectQuestions,
  clearLearningCache,
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
 * Cache duration: 7 days
 * Cache versioning: Automatically clears old caches when app is updated
 * 
 * IMPORTANT: Redux state is persisted and rehydrated on app start.
 * Data should only be fetched from API when cache is invalid or missing.
 */
class CachedBackendApiService {
  // Track if we've already fetched during this session to avoid duplicate calls
  private sessionFetchedSections = false;
  private sessionFetchedLevels = new Set<string>();
  private sessionFetchedQuestions = new Set<string>();
  private cacheInitialized = false;

  /**
   * Initialize the cache system (checks version and clears old data if needed)
   * Should be called early in app startup, before any data fetching
   */
  async initializeCache(): Promise<void> {
    if (this.cacheInitialized) return;

    try {
      // Initialize cache service (checks version and clears if needed)
      await cacheService.initialize();
      
      // If cache was cleared due to version change, also clear Redux store
      // This ensures fresh data is fetched
      if (!cacheService.isInitialized()) {
        store.dispatch(clearLearningCache());
      }
      
      this.cacheInitialized = true;
      console.log('✅ CachedBackendApi cache initialized');
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
    console.log('🔄 Session tracking reset');
  }

  /**
   * Get sections with caching
   * Priority: Redux (persisted) -> AsyncStorage -> API
   * Will NOT call API if valid cache exists
   */
  async getSections(): Promise<BackendSection[]> {
    // Ensure cache is initialized first
    await this.initializeCache();

    const state = store.getState();
    
    // 1. Try Redux store first (fastest, already rehydrated from persistence)
    const reduxCached = selectSections(state);
    if (reduxCached && reduxCached.length > 0) {
      console.log('✅ Sections from Redux cache (persisted)');
      return reduxCached;
    }

    // 2. Try AsyncStorage cache (backup)
    const asyncCached = await cacheService.getSections();
    if (asyncCached && asyncCached.length > 0) {
      console.log('✅ Sections from AsyncStorage cache');
      // Sync to Redux store for faster access
      store.dispatch(setSections(asyncCached));
      return asyncCached;
    }

    // 3. Only fetch from API if we don't have any cached data
    // Also check if we've already fetched this session to prevent duplicate calls
    if (this.sessionFetchedSections) {
      console.log('⏳ Sections already being fetched this session, returning empty');
      return [];
    }

    console.log('🌐 Fetching sections from API (no cache found)');
    this.sessionFetchedSections = true;
    store.dispatch(setSectionsLoading(true));
    
    try {
      const sections = await backendApi.getSections();
      
      // Save to both caches for persistence
      store.dispatch(setSections(sections));
      await cacheService.saveSections(sections);
      
      console.log(`💾 Saved ${sections.length} sections to cache`);
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
      console.log(`✅ Levels for ${sectionId} from Redux cache (persisted)`);
      return reduxCached;
    }

    // 2. Try AsyncStorage cache (backup)
    const asyncCached = await cacheService.getLevels(sectionId);
    if (asyncCached && asyncCached.length > 0) {
      console.log(`✅ Levels for ${sectionId} from AsyncStorage cache`);
      // Sync to Redux store for faster access
      store.dispatch(setLevels({ sectionId, levels: asyncCached }));
      return asyncCached;
    }

    // 3. Only fetch from API if we don't have any cached data
    if (this.sessionFetchedLevels.has(sectionId)) {
      console.log(`⏳ Levels for ${sectionId} already being fetched this session`);
      return [];
    }

    console.log(`🌐 Fetching levels for ${sectionId} from API (no cache found)`);
    this.sessionFetchedLevels.add(sectionId);
    
    try {
      const levels = await backendApi.getSectionLevels(sectionId);
      
      // Save to both caches for persistence
      store.dispatch(setLevels({ sectionId, levels }));
      await cacheService.saveLevels(sectionId, levels);
      
      console.log(`💾 Saved ${levels.length} levels for ${sectionId} to cache`);
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
  async getQuestions(levelId: string, numQuestions: number = 10, difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'): Promise<any[]> {
    // Ensure cache is initialized first
    await this.initializeCache();

    const state = store.getState();
    
    // 1. Try Redux store first (fastest, already rehydrated from persistence)
    const reduxCached = selectQuestions(levelId)(state);
    if (reduxCached && reduxCached.length > 0) {
      console.log(`✅ Questions for ${levelId} from Redux cache (persisted)`);
      return reduxCached;
    }

    // 2. Try AsyncStorage cache (backup)
    const asyncCached = await cacheService.getQuestions(levelId);
    if (asyncCached && asyncCached.length > 0) {
      console.log(`✅ Questions for ${levelId} from AsyncStorage cache`);
      // Sync to Redux store for faster access
      store.dispatch(setQuestions({ levelId, questions: asyncCached }));
      return asyncCached;
    }

    // 3. Only fetch from API if we don't have any cached data
    if (this.sessionFetchedQuestions.has(levelId)) {
      console.log(`⏳ Questions for ${levelId} already being fetched this session`);
      return [];
    }

    console.log(`🌐 Fetching questions for ${levelId} from API (no cache found)`);
    this.sessionFetchedQuestions.add(levelId);
    
    try {
      const response = await backendApi.getLevelQuestions(
        levelId,
        numQuestions,
        'mixed',
        true
      );
      
      const questions = response.questions || [];
      
      // Save to both caches for persistence
      store.dispatch(setQuestions({ levelId, questions }));
      await cacheService.saveQuestions(levelId, questions);
      
      console.log(`💾 Saved ${questions.length} questions for ${levelId} to cache`);
      return questions;
    } catch (error) {
      this.sessionFetchedQuestions.delete(levelId); // Allow retry on error
      throw error;
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
   * Check if questions are cached for a level (without fetching)
   */
  hasCachedQuestions(levelId: string): boolean {
    const state = store.getState();
    const reduxCached = selectQuestions(levelId)(state);
    return !!(reduxCached && reduxCached.length > 0);
  }

  /**
   * Force refresh sections (bypass cache)
   */
  async refreshSections(): Promise<BackendSection[]> {
    console.log('🔄 Force refreshing sections');
    this.sessionFetchedSections = false;
    await cacheService.invalidateSections();
    const sections = await backendApi.getSections();
    store.dispatch(setSections(sections));
    await cacheService.saveSections(sections);
    this.sessionFetchedSections = true;
    return sections;
  }

  /**
   * Force refresh levels for a section (bypass cache)
   */
  async refreshLevels(sectionId: string): Promise<BackendLevel[]> {
    console.log(`🔄 Force refreshing levels for ${sectionId}`);
    this.sessionFetchedLevels.delete(sectionId);
    await cacheService.invalidateLevels(sectionId);
    const levels = await backendApi.getSectionLevels(sectionId);
    store.dispatch(setLevels({ sectionId, levels }));
    await cacheService.saveLevels(sectionId, levels);
    this.sessionFetchedLevels.add(sectionId);
    return levels;
  }

  /**
   * Force refresh questions for a level (bypass cache)
   */
  async refreshQuestions(levelId: string, numQuestions: number = 10, difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'): Promise<any[]> {
    console.log(`🔄 Force refreshing questions for ${levelId}`);
    this.sessionFetchedQuestions.delete(levelId);
    await cacheService.invalidateQuestions(levelId);
    const response = await backendApi.getLevelQuestions(
      levelId,
      numQuestions,
      'mixed', // Explicitly request all question types
      true
    );
    const questions = response.questions || [];
    store.dispatch(setQuestions({ levelId, questions }));
    await cacheService.saveQuestions(levelId, questions);
    this.sessionFetchedQuestions.add(levelId);
    return questions;
  }

  /**
   * Clear all cached data, reset session tracking, and clear Redux store
   */
  async clearAllCache(): Promise<void> {
    console.log('🗑️ Clearing all cached data');
    this.resetSessionTracking();
    this.cacheInitialized = false;
    await cacheService.forceResetAllCaches();
    store.dispatch(clearLearningCache());
  }
}

export const cachedBackendApi = new CachedBackendApiService();
export default cachedBackendApi;
