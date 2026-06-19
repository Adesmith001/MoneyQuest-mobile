import {
  getReviewMilestone,
  shouldPromptForReview,
} from '../src/utils/reviewPrompt';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

assert(
  getReviewMilestone(9) === 0,
  'does not create a review milestone before ten completed levels'
);

assert(
  getReviewMilestone(10) === 10,
  'creates the first review milestone at ten completed levels'
);

assert(
  getReviewMilestone(27) === 20,
  'uses the latest completed ten-level milestone for higher completion counts'
);

assert(
  shouldPromptForReview({
    completedLevelsCount: 10,
    lastPromptedMilestone: 0,
  }) === true,
  'requests a review the first time the user reaches a ten-level milestone'
);

assert(
  shouldPromptForReview({
    completedLevelsCount: 10,
    lastPromptedMilestone: 10,
  }) === false,
  'does not request a review twice for the same milestone'
);
