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
  },
});

export const {
  setSections,
  setSectionsLoading,
  setLevels,
  setQuestions,
} = learningSlice.actions;

// Selectors - return cached data if it exists (no expiration)

export const selectSections = (state: { learning: LearningState }) => {
  const { data } = state.learning.sections;
  if (!data || data.length === 0) return null;
  return data;
};

export const selectSectionsLoading = (state: { learning: LearningState }) => 
  state.learning.sections.loading;

export const selectLevels = (sectionId: string) => (state: { learning: LearningState }) => {
  const cached = state.learning.levels[sectionId];
  if (!cached || !cached.data || cached.data.length === 0) return null;
  return cached.data;
};

export const selectQuestions = (levelId: string) => (state: { learning: LearningState }) => {
  const cached = state.learning.questions[levelId];
  if (!cached || !cached.data || cached.data.length === 0) return null;
  return cached.data;
};

// Selector to check if cache exists
// Useful for checking if we need to show loading state
export const selectHasCachedData = (state: { learning: LearningState }) => {
  return state.learning.sections.data.length > 0;
};

export default learningSlice.reducer;
