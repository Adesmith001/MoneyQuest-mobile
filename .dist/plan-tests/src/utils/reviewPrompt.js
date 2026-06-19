"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldPromptForReview = exports.getReviewMilestone = void 0;
const getReviewMilestone = (completedLevelsCount) => {
    if (completedLevelsCount < 10) {
        return 0;
    }
    return Math.floor(completedLevelsCount / 10) * 10;
};
exports.getReviewMilestone = getReviewMilestone;
const shouldPromptForReview = ({ completedLevelsCount, lastPromptedMilestone, }) => {
    const milestone = (0, exports.getReviewMilestone)(completedLevelsCount);
    return milestone > 0 && milestone > lastPromptedMilestone;
};
exports.shouldPromptForReview = shouldPromptForReview;
