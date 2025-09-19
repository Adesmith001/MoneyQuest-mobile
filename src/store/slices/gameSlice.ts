import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GameState } from '../../types';

const initialState: GameState = {
  currentLevel: 1,
  currentSection: 1,
  currentQuestion: 0,
  progress: 0,
  xp: 0,
  streak: 0,
  isQuestionActive: false,
  questionProgress: 0,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setCurrentLevel: (state, action: PayloadAction<number>) => {
      state.currentLevel = action.payload;
    },
    setCurrentSection: (state, action: PayloadAction<number>) => {
      state.currentSection = action.payload;
    },
    setCurrentQuestion: (state, action: PayloadAction<number>) => {
      state.currentQuestion = action.payload;
    },
    updateProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    addXP: (state, action: PayloadAction<number>) => {
      state.xp += action.payload;
    },
    setXP: (state, action: PayloadAction<number>) => {
      state.xp = action.payload;
    },
    updateStreak: (state, action: PayloadAction<number>) => {
      state.streak = action.payload;
    },
    setQuestionActive: (state, action: PayloadAction<boolean>) => {
      state.isQuestionActive = action.payload;
    },
    updateQuestionProgress: (state, action: PayloadAction<number>) => {
      state.questionProgress = action.payload;
    },
    nextQuestion: (state) => {
      state.currentQuestion += 1;
    },
    nextSection: (state) => {
      state.currentSection += 1;
      state.currentQuestion = 0;
    },
    nextLevel: (state) => {
      state.currentLevel += 1;
      state.currentSection = 1;
      state.currentQuestion = 0;
    },
    resetProgress: (state) => {
      state.progress = 0;
      state.questionProgress = 0;
      state.currentQuestion = 0;
    },
  },
});

export const {
  setCurrentLevel,
  setCurrentSection,
  setCurrentQuestion,
  updateProgress,
  addXP,
  setXP,
  updateStreak,
  setQuestionActive,
  updateQuestionProgress,
  nextQuestion,
  nextSection,
  nextLevel,
  resetProgress,
} = gameSlice.actions;

export default gameSlice.reducer;