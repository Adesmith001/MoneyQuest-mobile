import {
  CURRENT_FEATURE_TOUR_VERSION,
  TutorialActionKey,
  TutorialReplayKey,
} from '../store/slices/tutorialSlice';

type TutorialActionsState = Partial<Record<TutorialActionKey, boolean>>;
export type HomeSwipeTutorialStage = 'left' | 'right' | 'complete';
export type AppTourMode = 'first-run' | 'update';

export const getAppTourMode = ({
  isAuthenticated,
  hasCompletedAppTour,
  latestFeatureTourVersionSeen,
}: {
  isAuthenticated: boolean;
  hasCompletedAppTour: boolean;
  latestFeatureTourVersionSeen: number;
}): AppTourMode | null => {
  if (!isAuthenticated) {
    return null;
  }

  if (!hasCompletedAppTour) {
    return 'first-run';
  }

  return latestFeatureTourVersionSeen < CURRENT_FEATURE_TOUR_VERSION
    ? 'update'
    : null;
};

export const canAdvanceTutorialStep = ({
  requiredActionKey,
  completedActions,
}: {
  requiredActionKey?: TutorialActionKey;
  completedActions: TutorialActionsState;
}): boolean => {
  if (!requiredActionKey) {
    return true;
  }

  return Boolean(completedActions[requiredActionKey]);
};

export const getTutorialReplayActionKeys = (
  guideKey: TutorialReplayKey
): TutorialActionKey[] => {
  switch (guideKey) {
    case 'hasSeenHomeTour':
      return ['home_swipe_left_performed', 'home_swipe_right_performed'];
    case 'hasSeenProfileGuide':
      return ['profile_tutorial_hub_opened'];
    default:
      return [];
  }
};

export const getHomeSwipeTutorialAnchorIndex = (
  activeSectionIndex: number,
  totalSections: number
): number => {
  if (totalSections <= 1) {
    return 0;
  }

  if (activeSectionIndex >= totalSections - 1) {
    return totalSections - 2;
  }

  return Math.max(0, activeSectionIndex);
};

export const getNextHomeSwipeTutorialStage = (
  currentStage: HomeSwipeTutorialStage,
  previousIndex: number,
  nextIndex: number
): HomeSwipeTutorialStage => {
  if (currentStage === 'left' && nextIndex > previousIndex) {
    return 'right';
  }

  if (currentStage === 'right' && nextIndex < previousIndex) {
    return 'complete';
  }

  return currentStage;
};
