import { shouldResetMonthlyXP } from '../src/utils/monthlyXP';

const assertEqual = (actual: boolean, expected: boolean, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
};

const may10 = new Date(2026, 4, 10, 12, 0, 0);
const june1 = new Date(2026, 5, 1, 0, 5, 0);
const june10 = new Date(2026, 5, 10, 9, 15, 0);

assertEqual(
  shouldResetMonthlyXP('2026-04', may10),
  true,
  'resets stale monthly XP markers even after the first day has passed'
);

assertEqual(
  shouldResetMonthlyXP(null, may10),
  false,
  'does not reset users with no monthly XP marker after month has already started'
);

assertEqual(
  shouldResetMonthlyXP('2026-05', may10),
  false,
  'does not reset users already marked for the current month'
);

assertEqual(
  shouldResetMonthlyXP('2026-05', june1),
  true,
  'resets previous-month XP on the first day of a new month'
);

assertEqual(
  shouldResetMonthlyXP('2026-05', june10),
  true,
  'continues to treat previous-month XP as stale after month rollover'
);

assertEqual(
  shouldResetMonthlyXP('invalid-marker', june10),
  false,
  'ignores malformed monthly reset markers safely'
);
