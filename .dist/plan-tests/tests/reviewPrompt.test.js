"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reviewPrompt_1 = require("../src/utils/reviewPrompt");
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
assert((0, reviewPrompt_1.getReviewMilestone)(9) === 0, 'does not create a review milestone before ten completed levels');
assert((0, reviewPrompt_1.getReviewMilestone)(10) === 10, 'creates the first review milestone at ten completed levels');
assert((0, reviewPrompt_1.getReviewMilestone)(27) === 20, 'uses the latest completed ten-level milestone for higher completion counts');
assert((0, reviewPrompt_1.shouldPromptForReview)({
    completedLevelsCount: 10,
    lastPromptedMilestone: 0,
}) === true, 'requests a review the first time the user reaches a ten-level milestone');
assert((0, reviewPrompt_1.shouldPromptForReview)({
    completedLevelsCount: 10,
    lastPromptedMilestone: 10,
}) === false, 'does not request a review twice for the same milestone');
