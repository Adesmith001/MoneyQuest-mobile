import {
  calculateQuizAccuracy,
  normalizeSavedQuizProgress,
  resetQuizScrollPosition,
} from '../src/utils/quizProgress';
import { getCurrentWeekActivity } from '../src/utils/progressBehavior';

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const assertArrayEqual = <T>(actual: T[], expected: T[], message: string) => {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

const resumedProgress = normalizeSavedQuizProgress({
  currentQuestionIndex: 4,
  questionsCorrect: 3,
  xpEarned: 30,
  attempts: 5,
});

assertEqual(
  resumedProgress.currentQuestionIndex,
  4,
  'restores the saved question index when a user resumes a lesson'
);

assertEqual(
  resumedProgress.questionsCorrect,
  3,
  'restores the saved correct-answer count when a user resumes a lesson'
);

assertEqual(
  resumedProgress.xpEarned,
  30,
  'restores the saved earned XP when a user resumes a lesson'
);

assertEqual(
  resumedProgress.totalAttempts,
  5,
  'restores the saved total-attempt count so resumed accuracy stays exact'
);

assertEqual(
  calculateQuizAccuracy(3, 5),
  60,
  'calculates accuracy from correct answers over total attempts'
);

assertEqual(
  calculateQuizAccuracy(5, 3),
  100,
  'never returns impossible accuracy above 100 percent'
);

const scrollCalls: Array<{ y: number; animated: boolean }> = [];
resetQuizScrollPosition({
  scrollTo: (options) => scrollCalls.push(options),
});
resetQuizScrollPosition(null);

assertEqual(
  scrollCalls.length,
  1,
  'resets quiz scrolling exactly once when a target exists'
);
assertEqual(scrollCalls[0].y, 0, 'resets each question to the top');
assertEqual(
  scrollCalls[0].animated,
  false,
  'avoids visible scroll animation between questions'
);

assertArrayEqual(
  getCurrentWeekActivity(['2026-06-21', '2026-06-24', '2026-06-28'], '2026-06-24'),
  ['2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26', '2026-06-27'],
  'derives the current Sunday-first activity window for the active week'
);
