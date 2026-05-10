export const shouldRetryQuestionsWithMultilevel = (
  questions: unknown[] | null | undefined,
  useMultilevel: boolean,
): boolean => {
  return !useMultilevel && (!questions || questions.length === 0);
};
