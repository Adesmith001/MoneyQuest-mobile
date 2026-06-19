export const getReviewMilestone = (completedLevelsCount: number): number => {
  if (completedLevelsCount < 10) {
    return 0;
  }

  return Math.floor(completedLevelsCount / 10) * 10;
};

export const shouldPromptForReview = ({
  completedLevelsCount,
  lastPromptedMilestone,
}: {
  completedLevelsCount: number;
  lastPromptedMilestone: number;
}): boolean => {
  const milestone = getReviewMilestone(completedLevelsCount);
  return milestone > 0 && milestone > lastPromptedMilestone;
};
