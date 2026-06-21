"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetGuide = exports.resetAllTutorials = exports.resetTutorialActions = exports.markTutorialActionCompleted = exports.skipTour = exports.nextTourStep = exports.startAppTour = exports.completeAppTour = exports.markProfileGuideSeen = exports.markStreakGuideSeen = exports.markQuestionGuideSeen = exports.markHomeTourSeen = exports.normalizeTutorialState = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    hasSeenHomeTour: false,
    hasSeenQuestionGuide: false,
    hasSeenStreakGuide: false,
    hasSeenProfileGuide: false,
    hasCompletedAppTour: false,
    isTourActive: false,
    currentTourStep: 0,
    completedActions: {},
};
const normalizeTutorialState = (state) => ({
    ...initialState,
    ...state,
    completedActions: state?.completedActions ?? {},
});
exports.normalizeTutorialState = normalizeTutorialState;
const tutorialSlice = (0, toolkit_1.createSlice)({
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
        markTutorialActionCompleted: (state, action) => {
            state.completedActions ?? (state.completedActions = {});
            state.completedActions[action.payload] = true;
        },
        resetTutorialActions: (state, action) => {
            state.completedActions ?? (state.completedActions = {});
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
        resetGuide: (state, action) => {
            const key = action.payload;
            if (key in state && typeof state[key] === 'boolean') {
                state[key] = false;
            }
        },
    },
});
_a = tutorialSlice.actions, exports.markHomeTourSeen = _a.markHomeTourSeen, exports.markQuestionGuideSeen = _a.markQuestionGuideSeen, exports.markStreakGuideSeen = _a.markStreakGuideSeen, exports.markProfileGuideSeen = _a.markProfileGuideSeen, exports.completeAppTour = _a.completeAppTour, exports.startAppTour = _a.startAppTour, exports.nextTourStep = _a.nextTourStep, exports.skipTour = _a.skipTour, exports.markTutorialActionCompleted = _a.markTutorialActionCompleted, exports.resetTutorialActions = _a.resetTutorialActions, exports.resetAllTutorials = _a.resetAllTutorials, exports.resetGuide = _a.resetGuide;
exports.default = tutorialSlice.reducer;
