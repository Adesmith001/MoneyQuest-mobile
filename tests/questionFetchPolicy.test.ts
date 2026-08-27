import {
  shouldRecoverLevelFromEmptyQuestions,
  shouldRetryQuestionsWithMultilevel,
} from '../src/services/questionFetchPolicy';

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

assertEqual(
  shouldRecoverLevelFromEmptyQuestions([], false),
  true,
  'recovers a stale level when no questions are returned'
);

assertEqual(
  shouldRecoverLevelFromEmptyQuestions([{ question_id: 1 }], false),
  false,
  'does not recover a level when questions were returned'
);

assertEqual(
  shouldRecoverLevelFromEmptyQuestions([], true),
  false,
  'does not repeat stale-level recovery'
);
