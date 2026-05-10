import { shouldRetryQuestionsWithMultilevel } from '../src/services/questionFetchPolicy';

const assertEqual = (actual: boolean, expected: boolean, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
};

assertEqual(
  shouldRetryQuestionsWithMultilevel([], false),
  true,
  'retries with multilevel when the first question fetch is empty'
);

assertEqual(
  shouldRetryQuestionsWithMultilevel([{ question_id: 1 }], false),
  false,
  'does not retry with multilevel when normal questions were found'
);

assertEqual(
  shouldRetryQuestionsWithMultilevel([], true),
  false,
  'does not retry when the request already used multilevel'
);
