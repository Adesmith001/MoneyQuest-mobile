"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const tutorialSlice_1 = __importStar(require("../src/store/slices/tutorialSlice"));
const assert = (condition, message) => {
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
const completedActionState = (0, tutorialSlice_1.default)(legacyState, (0, tutorialSlice_1.markTutorialActionCompleted)('profile_tutorial_hub_opened'));
assert(completedActionState.completedActions?.profile_tutorial_hub_opened === true, 'self-heals legacy tutorial state and records the new completed tutorial action');
const resetActionState = (0, tutorialSlice_1.default)(legacyState, (0, tutorialSlice_1.resetTutorialActions)(['profile_tutorial_hub_opened']));
assert(typeof resetActionState.completedActions === 'object' &&
    resetActionState.completedActions !== null &&
    Object.keys(resetActionState.completedActions).length === 0, 'self-heals legacy tutorial state before replay actions attempt to clear tutorial tokens');
