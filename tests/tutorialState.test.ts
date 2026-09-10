import tutorialReducer, {
  completeAppTour,
  completeFeatureTour,
  markTutorialActionCompleted,
  normalizeTutorialState,
  resetTutorialActions,
  CURRENT_FEATURE_TOUR_VERSION,
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

assert(
  normalizeTutorialState(legacyState as any).latestFeatureTourVersionSeen === 0,
  'legacy installs are eligible for the current feature update tour'
);

const completedFirstRunState = tutorialReducer(
  undefined,
  completeAppTour()
);

assert(
  completedFirstRunState.latestFeatureTourVersionSeen === CURRENT_FEATURE_TOUR_VERSION,
  'new users do not see the update tour immediately after the full first-run tour'
);

const completedUpdateState = tutorialReducer(
  {
    ...completedFirstRunState,
    latestFeatureTourVersionSeen: 0,
  },
  completeFeatureTour()
);

assert(
  completedUpdateState.latestFeatureTourVersionSeen === CURRENT_FEATURE_TOUR_VERSION,
  'existing users only see the current feature update tour once'
);
