"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextHomeSwipeTutorialStage = exports.getHomeSwipeTutorialAnchorIndex = exports.getTutorialReplayActionKeys = exports.canAdvanceTutorialStep = void 0;
const canAdvanceTutorialStep = ({ requiredActionKey, completedActions, }) => {
    if (!requiredActionKey) {
        return true;
    }
    return Boolean(completedActions[requiredActionKey]);
};
exports.canAdvanceTutorialStep = canAdvanceTutorialStep;
const getTutorialReplayActionKeys = (guideKey) => {
    switch (guideKey) {
        case 'hasSeenHomeTour':
            return ['home_swipe_left_performed', 'home_swipe_right_performed'];
        case 'hasSeenProfileGuide':
            return ['profile_tutorial_hub_opened'];
        default:
            return [];
    }
};
exports.getTutorialReplayActionKeys = getTutorialReplayActionKeys;
const getHomeSwipeTutorialAnchorIndex = (activeSectionIndex, totalSections) => {
    if (totalSections <= 1) {
        return 0;
    }
    if (activeSectionIndex >= totalSections - 1) {
        return totalSections - 2;
    }
    return Math.max(0, activeSectionIndex);
};
exports.getHomeSwipeTutorialAnchorIndex = getHomeSwipeTutorialAnchorIndex;
const getNextHomeSwipeTutorialStage = (currentStage, previousIndex, nextIndex) => {
    if (currentStage === 'left' && nextIndex > previousIndex) {
        return 'right';
    }
    if (currentStage === 'right' && nextIndex < previousIndex) {
        return 'complete';
    }
    return currentStage;
};
exports.getNextHomeSwipeTutorialStage = getNextHomeSwipeTutorialStage;
