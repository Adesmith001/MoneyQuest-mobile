import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BackendSection, BackendLevel, BackendQuestionResponse } from '../../types';

interface LearningState {
  sections: {
    data: BackendSection[];
    timestamp: number | null;
    loading: boolean;
  };
  levels: {
    [sectionId: string]: {
      data: BackendLevel[];
      timestamp: number;
    };
  };
  questions: {
    [levelId: string]: {
      data: any[];
      timestamp: number;
    };
  };
}

// Cache duration: 30 days in milliseconds
export const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000;

const initialState: LearningState = {
  sections: { data: [], timestamp: null, loading: false },
  levels: {},
  questions: {},
};

const learningSlice = createSlice({
  name: 'learning',
  initialState,
  reducers: {
    setSections(state, action: PayloadAction<BackendSection[]>) {
      state.sections.data = action.payload;
      state.sections.timestamp = Date.now();
      state.sections.loading = false;
    },
    setSectionsLoading(state, action: PayloadAction<boolean>) {
      state.sections.loading = action.payload;
    },
    setLevels(state, action: PayloadAction<{ sectionId: string; levels: BackendLevel[] }>) {
      state.levels[action.payload.sectionId] = {
        data: action.payload.levels,
        timestamp: Date.now(),
      };
    },
    setQuestions(state, action: PayloadAction<{ levelId: string; questions: any[] }>) {
      state.questions[action.payload.levelId] = {
        data: action.payload.questions,
        timestamp: Date.now(),
      };
    },
    clearLearningCache(state) {
      state.sections = { data: [], timestamp: null, loading: false };
      state.levels = {};
      state.questions = {};
    },
    invalidateSections(state) {
      state.sections.timestamp = null;
    },
    invalidateLevels(state, action: PayloadAction<string>) {
      delete state.levels[action.payload];
    },
    invalidateQuestions(state, action: PayloadAction<string>) {
      delete state.questions[action.payload];
    },
  },
});

export const {
  setSections,
  setSectionsLoading,
  setLevels,
  setQuestions,
  clearLearningCache,
  invalidateSections,
  invalidateLevels,
  invalidateQuestions,
} = learningSlice.actions;

// Selectors with cache validation
// These selectors are used by cachedBackendApi to check if data exists
// The CACHE_DURATION check ensures stale data is refreshed

export const selectSections = (state: { learning: LearningState }) => {
  const { data, timestamp } = state.learning.sections;
  if (!timestamp || !data || data.length === 0) return null;
  
  const age = Date.now() - timestamp;
  const isValid = age < CACHE_DURATION;
  
  // Only log cache status occasionally to reduce noise
  if (process.env.NODE_ENV === 'development') {
    console.log(`📦 Sections cache: ${data.length} items, ${Math.floor(age / (24 * 60 * 60 * 1000))} days old, valid: ${isValid}`);
  }
  return isValid ? data : null;
};

export const selectSectionsLoading = (state: { learning: LearningState }) => 
  state.learning.sections.loading;

export const selectLevels = (sectionId: string) => (state: { learning: LearningState }) => {
  const cached = state.learning.levels[sectionId];
  if (!cached || !cached.data || cached.data.length === 0) return null;
  
  const age = Date.now() - cached.timestamp;
  const isValid = age < CACHE_DURATION;
  
  return isValid ? cached.data : null;
};

export const selectQuestions = (levelId: string) => (state: { learning: LearningState }) => {
  const cached = state.learning.questions[levelId];
  if (!cached || !cached.data || cached.data.length === 0) return null;
  
  const age = Date.now() - cached.timestamp;
  const isValid = age < CACHE_DURATION;
  
  return isValid ? cached.data : null;
};

// Selector to check if cache exists (without validation)
// Useful for checking if we need to show loading state
export const selectHasCachedData = (state: { learning: LearningState }) => {
  return state.learning.sections.data.length > 0;
};

export default learningSlice.reducer;
