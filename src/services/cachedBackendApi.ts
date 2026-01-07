import { store } from '../store';
import {
  setSections,
  setSectionsLoading,
  setLevels,
  setQuestions,
  selectSections,
  selectLevels,
  selectQuestions,
} from '../store/slices/learningSlice';
import backendApi from './backendApi';
import cacheService from './cacheService';
import { BackendSection, BackendLevel } from '../types';

/**
 * Cached Backend API Service
 * Implements a 3-tier caching strategy:
 * 1. Redux store (fastest, in-memory)
 * 2. AsyncStorage (persistent, offline)
 * 3. Backend API (authoritative source)
 * 
 * Cache duration: 30 days
 */
class CachedBackendApiService {
  /**
   * Get sections with caching
   * Priority: Redux -> AsyncStorage -> API
   */
  async getSections(): Promise<BackendSection[]> {
    const state = store.getState();
    
    // 1. Try Redux store first (fastest)
    const reduxCached = selectSections(state);
    if (reduxCached && reduxCached.length > 0) {
      console.log('✅ Sections from Redux cache');
      return reduxCached;
    }

    // 2. Try AsyncStorage cache
    const asyncCached = await cacheService.getSections();
    if (asyncCached && asyncCached.length > 0) {
      console.log('✅ Sections from AsyncStorage cache');
      store.dispatch(setSections(asyncCached));
      return asyncCached;
    }

    // 3. Fetch from API
    console.log('🌐 Fetching sections from API');
    store.dispatch(setSectionsLoading(true));
    
    try {
      const sections = await backendApi.getSections();
      
      // Save to both caches
      store.dispatch(setSections(sections));
      await cacheService.saveSections(sections);
      
      return sections;
    } catch (error) {
      store.dispatch(setSectionsLoading(false));
      throw error;
    }
  }

  /**
   * Get levels for a section with caching
   * Priority: Redux -> AsyncStorage -> API
   */
  async getLevels(sectionId: string): Promise<BackendLevel[]> {
    const state = store.getState();
    
    // 1. Try Redux store first (fastest)
    const reduxCached = selectLevels(sectionId)(state);
    if (reduxCached && reduxCached.length > 0) {
      console.log(`✅ Levels for ${sectionId} from Redux cache`);
      return reduxCached;
    }

    // 2. Try AsyncStorage cache
    const asyncCached = await cacheService.getLevels(sectionId);
    if (asyncCached && asyncCached.length > 0) {
      console.log(`✅ Levels for ${sectionId} from AsyncStorage cache`);
      store.dispatch(setLevels({ sectionId, levels: asyncCached }));
      return asyncCached;
    }

    // 3. Fetch from API
    console.log(`🌐 Fetching levels for ${sectionId} from API`);
    
    try {
      const levels = await backendApi.getSectionLevels(sectionId);
      
      // Save to both caches
      store.dispatch(setLevels({ sectionId, levels }));
      await cacheService.saveLevels(sectionId, levels);
      
      return levels;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get questions for a level with caching
   * Priority: Redux -> AsyncStorage -> API
   */
  async getQuestions(levelId: string, numQuestions: number = 10, difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'): Promise<any[]> {
    const state = store.getState();
    
    // 1. Try Redux store first (fastest)
    const reduxCached = selectQuestions(levelId)(state);
    if (reduxCached && reduxCached.length > 0) {
      console.log(`✅ Questions for ${levelId} from Redux cache`);
      return reduxCached;
    }

    // 2. Try AsyncStorage cache
    const asyncCached = await cacheService.getQuestions(levelId);
    if (asyncCached && asyncCached.length > 0) {
      console.log(`✅ Questions for ${levelId} from AsyncStorage cache`);
      store.dispatch(setQuestions({ levelId, questions: asyncCached }));
      return asyncCached;
    }

    // 3. Fetch from API
    console.log(`🌐 Fetching questions for ${levelId} from API`);
    
    try {
      const response = await backendApi.generateQuestions(
        levelId,
        numQuestions,
        difficulty,
        'mixed',
        true
      );
      
      const questions = response.questions || [];
      
      // Save to both caches
      store.dispatch(setQuestions({ levelId, questions }));
      await cacheService.saveQuestions(levelId, questions);
      
      return questions;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Force refresh sections (bypass cache)
   */
  async refreshSections(): Promise<BackendSection[]> {
    console.log('🔄 Force refreshing sections');
    await cacheService.invalidateSections();
    const sections = await backendApi.getSections();
    store.dispatch(setSections(sections));
    await cacheService.saveSections(sections);
    return sections;
  }

  /**
   * Force refresh levels for a section (bypass cache)
   */
  async refreshLevels(sectionId: string): Promise<BackendLevel[]> {
    console.log(`🔄 Force refreshing levels for ${sectionId}`);
    await cacheService.invalidateLevels(sectionId);
    const levels = await backendApi.getSectionLevels(sectionId);
    store.dispatch(setLevels({ sectionId, levels }));
    await cacheService.saveLevels(sectionId, levels);
    return levels;
  }

  /**
   * Force refresh questions for a level (bypass cache)
   */
  async refreshQuestions(levelId: string, numQuestions: number = 10, difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'): Promise<any[]> {
    console.log(`🔄 Force refreshing questions for ${levelId}`);
    await cacheService.invalidateQuestions(levelId);
    const response = await backendApi.generateQuestions(levelId, numQuestions, difficulty, 'mixed', true);
    const questions = response.questions || [];
    store.dispatch(setQuestions({ levelId, questions }));
    await cacheService.saveQuestions(levelId, questions);
    return questions;
  }
}

export const cachedBackendApi = new CachedBackendApiService();
export default cachedBackendApi;
