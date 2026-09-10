import {
  canAdvanceTutorialStep,
  getAppTourMode,
  getHomeSwipeTutorialAnchorIndex,
  getNextHomeSwipeTutorialStage,
  getTutorialReplayActionKeys,
} from '../src/utils/tutorialBehavior';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

assert(
  canAdvanceTutorialStep({
    requiredActionKey: 'home_swipe_left_performed',
    completedActions: {},
  }) === false,
  'blocks a gated tutorial step before the required action token is present'
);

assert(
  canAdvanceTutorialStep({
    requiredActionKey: 'home_swipe_left_performed',
    completedActions: { home_swipe_left_performed: true },
  }) === true,
  'allows a gated tutorial step after the required action token is emitted'
);

assert(
  JSON.stringify(getTutorialReplayActionKeys('hasSeenHomeTour')) ===
    JSON.stringify(['home_swipe_left_performed', 'home_swipe_right_performed']),
  'resets both Home swipe action tokens when replaying the home tutorial'
);

assert(
  JSON.stringify(getTutorialReplayActionKeys('hasSeenProfileGuide')) ===
    JSON.stringify(['profile_tutorial_hub_opened']),
  'resets the Profile tutorial-hub action token when replaying the profile guide'
);

assert(
  getHomeSwipeTutorialAnchorIndex(4, 5) === 3,
  'moves the swipe tutorial anchor off the last section so left then right remains possible'
);

assert(
  getHomeSwipeTutorialAnchorIndex(1, 5) === 1,
  'keeps the current section as the swipe tutorial anchor when both directions are already available'
);

assert(
  getNextHomeSwipeTutorialStage('left', 0, 1) === 'right',
  'advances from the left-swipe prompt to the right-swipe prompt after a real forward page change'
);

assert(
  getNextHomeSwipeTutorialStage('right', 1, 0) === 'complete',
  'finishes the swipe tutorial after the user swipes back in the opposite direction'
);

assert(
  getAppTourMode({
    isAuthenticated: true,
    hasCompletedAppTour: false,
    latestFeatureTourVersionSeen: 0,
  }) === 'first-run',
  'new authenticated users receive the full first-run tour'
);

assert(
  getAppTourMode({
    isAuthenticated: true,
    hasCompletedAppTour: true,
    latestFeatureTourVersionSeen: 0,
  }) === 'update',
  'existing users receive the feature update tour after upgrading'
);

assert(
  getAppTourMode({
    isAuthenticated: true,
    hasCompletedAppTour: true,
    latestFeatureTourVersionSeen: 1,
  }) === null,
  'the feature update tour is not repeated once seen'
);

assert(
  getAppTourMode({
    isAuthenticated: false,
    hasCompletedAppTour: true,
    latestFeatureTourVersionSeen: 0,
  }) === null,
  'signed-out users are not interrupted by an account feature tour'
);
