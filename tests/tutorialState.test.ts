import tutorialReducer, {
  markTutorialActionCompleted,
  resetTutorialActions,
} from '../src/store/slices/tutorialSlice';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const legacyState = {
  hasSeenHomeTour: false,
  hasSeenQuestionGuide: false,
  hasSeenStreakGuide: false,
  hasSeenProfileGuide: false,
  hasCompletedAppTour: false,
  isTourActive: false,
  currentTourStep: 0,
};

const completedActionState = tutorialReducer(
  legacyState as any,
  markTutorialActionCompleted('profile_tutorial_hub_opened')
);

assert(
  completedActionState.completedActions?.profile_tutorial_hub_opened === true,
  'self-heals legacy tutorial state and records the new completed tutorial action'
);

const resetActionState = tutorialReducer(
  legacyState as any,
  resetTutorialActions(['profile_tutorial_hub_opened'])
);

assert(
  typeof resetActionState.completedActions === 'object' &&
    resetActionState.completedActions !== null &&
    Object.keys(resetActionState.completedActions).length === 0,
  'self-heals legacy tutorial state before replay actions attempt to clear tutorial tokens'
);
