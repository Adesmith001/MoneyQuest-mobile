import { store } from '../store';
import { ENV } from '../config/environment';
import {
  clearLearningCache,
  setSections,
  setSectionsLoading,
  setLevels,
  selectSections,
  selectLevels,
} from '../store/slices/learningSlice';
import backendApi from './backendApi';
import cacheService from './cacheService';
import { BackendSection, BackendLevel } from '../types';

const HARD_FALLBACK_CACHE_TTL_MS = 60 * 60 * 1000;

const getCacheTtlMs = (): number => {
  const rawTtlSeconds = ENV.MONEYQUEST_CACHE_TTL_SECONDS;
  const ttlSeconds = Number.parseInt(rawTtlSeconds, 10);

  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return HARD_FALLBACK_CACHE_TTL_MS;
  }

  return ttlSeconds * 1000;
};

class CachedBackendApiService {
  private sessionFetchedSections = false;
  private sessionFetchedLevels = new Set<string>();
  private sessionFetchedQuestions = new Set<string>();
  private cacheInitialized = false;

  private isTimestampStale(timestamp: number | null | undefined): boolean {
    if (!timestamp || !Number.isFinite(timestamp)) {
      return true;
    }

    return Date.now() - timestamp > getCacheTtlMs();
  }

  async initializeCache(): Promise<void> {
    if (this.cacheInitialized) {
      return;
    }

    try {
      const { cacheVersionBumped } = await cacheService.initialize();

      if (cacheVersionBumped) {
        // Keep in-memory learning/progress UI state intact; only reset fetch-session
        // guards so subsequent calls can repopulate from the migrated cache/backend.
        this.resetSessionTracking();
      }
    } catch (error) {
      console.error('Failed to initialize cache:', error);
    } finally {
      this.cacheInitialized = true;
    }
  }

  resetSessionTracking() {
    this.sessionFetchedSections = false;
    this.sessionFetchedLevels.clear();
    this.sessionFetchedQuestions.clear();
  }

  async getSections(): Promise<BackendSection[]> {
    await this.initializeCache();

    const state = store.getState() as any;
    const reduxCached = selectSections(state);
    const reduxTimestamp = state.learning?.sections?.timestamp as
      | number
      | null
      | undefined;

    if (reduxCached && reduxCached.length > 0) {
      if (!this.isTimestampStale(reduxTimestamp)) {
        return reduxCached;
      }

      try {
        const freshSections = await backendApi.getSections();
        if (freshSections && freshSections.length > 0) {
          store.dispatch(setSections(freshSections));
          await cacheService.saveSections(freshSections);
          return freshSections;
        }
      } catch (error) {
        console.warn('Sections refresh failed, using stale Redux cache:', error);
      }

      return reduxCached;
    }

    const asyncCached = await cacheService.getSections();
    if (asyncCached && asyncCached.length > 0) {
      const asyncStale = await cacheService.isSectionsCacheStale();

      if (!asyncStale) {
        store.dispatch(setSections(asyncCached));
        return asyncCached;
      }

      try {
        const freshSections = await backendApi.getSections();
        if (freshSections && freshSections.length > 0) {
          store.dispatch(setSections(freshSections));
          await cacheService.saveSections(freshSections);
          return freshSections;
        }
      } catch (error) {
        console.warn('Sections refresh failed, using stale storage cache:', error);
      }

      store.dispatch(setSections(asyncCached));
      return asyncCached;
    }

    if (this.sessionFetchedSections) {
      return [];
    }

    this.sessionFetchedSections = true;
    store.dispatch(setSectionsLoading(true));

    try {
      const sections = await backendApi.getSections();

      if (!sections || sections.length === 0) {
        store.dispatch(setSectionsLoading(false));
        this.sessionFetchedSections = false;
        return [];
      }

      store.dispatch(setSections(sections));
      await cacheService.saveSections(sections);
      return sections;
    } catch (error) {
      store.dispatch(setSectionsLoading(false));
      this.sessionFetchedSections = false;
      throw error;
    }
  }

  async getLevels(sectionId: string): Promise<BackendLevel[]> {
    await this.initializeCache();

    const state = store.getState() as any;
    const reduxCached = selectLevels(sectionId)(state);
    const reduxTimestamp = state.learning?.levels?.[sectionId]?.timestamp as
      | number
      | null
      | undefined;

    if (reduxCached && reduxCached.length > 0) {
      if (!this.isTimestampStale(reduxTimestamp)) {
        return reduxCached;
      }

      try {
        const freshLevels = await backendApi.getSectionLevels(sectionId);
        if (freshLevels && freshLevels.length > 0) {
          store.dispatch(setLevels({ sectionId, levels: freshLevels }));
          await cacheService.saveLevels(sectionId, freshLevels);
          return freshLevels;
        }
      } catch (error) {
        console.warn(
          `Levels refresh failed for section ${sectionId}, using stale Redux cache:`,
          error
        );
      }

      return reduxCached;
    }

    const asyncCached = await cacheService.getLevels(sectionId);
    if (asyncCached && asyncCached.length > 0) {
      const asyncStale = await cacheService.isLevelsCacheStale(sectionId);

      if (!asyncStale) {
        store.dispatch(setLevels({ sectionId, levels: asyncCached }));
        return asyncCached;
      }

      try {
        const freshLevels = await backendApi.getSectionLevels(sectionId);
        if (freshLevels && freshLevels.length > 0) {
          store.dispatch(setLevels({ sectionId, levels: freshLevels }));
          await cacheService.saveLevels(sectionId, freshLevels);
          return freshLevels;
        }
      } catch (error) {
        console.warn(
          `Levels refresh failed for section ${sectionId}, using stale storage cache:`,
          error
        );
      }

      store.dispatch(setLevels({ sectionId, levels: asyncCached }));
      return asyncCached;
    }

    if (this.sessionFetchedLevels.has(sectionId)) {
      return [];
    }

    this.sessionFetchedLevels.add(sectionId);

    try {
      const levels = await backendApi.getSectionLevels(sectionId);

      if (!levels || levels.length === 0) {
        this.sessionFetchedLevels.delete(sectionId);
        return [];
      }

      store.dispatch(setLevels({ sectionId, levels }));
      await cacheService.saveLevels(sectionId, levels);
      return levels;
    } catch (error) {
      this.sessionFetchedLevels.delete(sectionId);
      throw error;
    }
  }

  async getQuestions(
    levelId: string,
    numQuestions: number = 5,
    _difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'
  ): Promise<any[]> {
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

      return response.questions || [];
    } finally {
      this.sessionFetchedQuestions.delete(levelId);
    }
  }

  hasCachedSections(): boolean {
    const state = store.getState();
    const reduxCached = selectSections(state as any);
    return !!(reduxCached && reduxCached.length > 0);
  }

  hasCachedLevels(sectionId: string): boolean {
    const state = store.getState();
    const reduxCached = selectLevels(sectionId)(state as any);
    return !!(reduxCached && reduxCached.length > 0);
  }

  hasCachedQuestions(_levelId: string): boolean {
    return false;
  }

  async forceRefreshLearningPath(): Promise<BackendSection[]> {
    await this.initializeCache();
    store.dispatch(setSectionsLoading(true));

    try {
      const freshSections = await backendApi.getSections();
      if (!freshSections || freshSections.length === 0) {
        return [];
      }

      await cacheService.clearLearningPathCache();
      store.dispatch(clearLearningCache());

      store.dispatch(setSections(freshSections));
      await cacheService.saveSections(freshSections);

      for (const section of freshSections) {
        if (!section.section_id) {
          continue;
        }

        try {
          const freshLevels = await backendApi.getSectionLevels(section.section_id);
          if (freshLevels && freshLevels.length > 0) {
            store.dispatch(setLevels({ sectionId: section.section_id, levels: freshLevels }));
            await cacheService.saveLevels(section.section_id, freshLevels);
          }
        } catch (error) {
          console.warn(
            `Failed to refresh levels for section ${section.section_id}:`,
            error
          );
        }
      }

      this.resetSessionTracking();
      this.sessionFetchedSections = true;
      return freshSections;
    } finally {
      store.dispatch(setSectionsLoading(false));
    }
  }
}

export const cachedBackendApi = new CachedBackendApiService();
export default cachedBackendApi;
