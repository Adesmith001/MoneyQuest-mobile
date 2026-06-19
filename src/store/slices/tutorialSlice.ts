import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TutorialActionKey =
  | 'home_swipe_left_performed'
  | 'home_swipe_right_performed'
  | 'profile_tutorial_hub_opened';

export type TutorialReplayKey =
  | 'hasCompletedAppTour'
  | 'hasSeenHomeTour'
  | 'hasSeenQuestionGuide'
  | 'hasSeenStreakGuide'
  | 'hasSeenProfileGuide';

export interface TutorialState {
  // Per-screen coach mark flags
  hasSeenHomeTour: boolean;
  hasSeenQuestionGuide: boolean;
  hasSeenStreakGuide: boolean;
  hasSeenProfileGuide: boolean;
  // Post-onboarding guided tour
  hasCompletedAppTour: boolean;
  // Whether the tour is actively showing
  isTourActive: boolean;
  currentTourStep: number;
  completedActions: Partial<Record<TutorialActionKey, boolean>>;
}

const initialState: TutorialState = {
  hasSeenHomeTour: false,
  hasSeenQuestionGuide: false,
  hasSeenStreakGuide: false,
  hasSeenProfileGuide: false,
  hasCompletedAppTour: false,
  isTourActive: false,
  currentTourStep: 0,
  completedActions: {},
};

const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    markHomeTourSeen: (state) => {
      state.hasSeenHomeTour = true;
    },
    markQuestionGuideSeen: (state) => {
      state.hasSeenQuestionGuide = true;
    },
    markStreakGuideSeen: (state) => {
      state.hasSeenStreakGuide = true;
    },
    markProfileGuideSeen: (state) => {
      state.hasSeenProfileGuide = true;
    },
    completeAppTour: (state) => {
      state.hasCompletedAppTour = true;
      state.isTourActive = false;
      state.currentTourStep = 0;
    },
    startAppTour: (state) => {
      state.isTourActive = true;
      state.currentTourStep = 0;
    },
    nextTourStep: (state) => {
      state.currentTourStep += 1;
    },
    skipTour: (state) => {
      state.isTourActive = false;
      state.currentTourStep = 0;
      state.hasCompletedAppTour = true;
    },
    markTutorialActionCompleted: (state, action: PayloadAction<TutorialActionKey>) => {
      state.completedActions[action.payload] = true;
    },
    resetTutorialActions: (state, action: PayloadAction<TutorialActionKey[] | undefined>) => {
      if (!action.payload || action.payload.length === 0) {
        state.completedActions = {};
        return;
      }

      action.payload.forEach((key) => {
        delete state.completedActions[key];
      });
    },
    // Reset all tutorial flags (for settings "Replay Tutorial")
    resetAllTutorials: (state) => {
      state.hasSeenHomeTour = false;
      state.hasSeenQuestionGuide = false;
      state.hasSeenStreakGuide = false;
      state.hasSeenProfileGuide = false;
      state.hasCompletedAppTour = false;
      state.isTourActive = false;
      state.currentTourStep = 0;
      state.completedActions = {};
    },
    // Reset a specific guide for replay
    resetGuide: (state, action: PayloadAction<TutorialReplayKey>) => {
      const key = action.payload;
      if (key in state && typeof state[key] === 'boolean') {
        (state as any)[key] = false;
      }
    },
  },
});

export const {
  markHomeTourSeen,
  markQuestionGuideSeen,
  markStreakGuideSeen,
  markProfileGuideSeen,
  completeAppTour,
  startAppTour,
  nextTourStep,
  skipTour,
  markTutorialActionCompleted,
  resetTutorialActions,
  resetAllTutorials,
  resetGuide,
} = tutorialSlice.actions;

export default tutorialSlice.reducer;
