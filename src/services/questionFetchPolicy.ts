export const shouldRetryQuestionsWithMultilevel = (
  questions: unknown[] | null | undefined,
  useMultilevel: boolean,
): boolean => {
  return !useMultilevel && (!questions || questions.length === 0);
};

export const shouldRecoverLevelFromEmptyQuestions = (
  questions: unknown[] | null | undefined,
  recoveryAttempted: boolean,
): boolean => {
  return !recoveryAttempted && (!questions || questions.length === 0);
};
