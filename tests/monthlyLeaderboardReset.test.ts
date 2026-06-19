import {
  applyMonthlyLeaderboardReset,
  getMonthlyResetMonthKey,
  type MonthlyResetUserRecord,
  type MonthlyResetLeaderboardRecord,
} from '../src/utils/monthlyLeaderboardReset';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

const resetDate = new Date('2026-06-01T00:00:00+01:00');

assertEqual(
  getMonthlyResetMonthKey(resetDate),
  '2026-06',
  'derives the new month key from the reset instant'
);

const users: MonthlyResetUserRecord[] = [
  { $id: 'u1', monthlyXP: 120, totalXP: 900, xp: 450, lastMonthlyReset: '2026-05' },
  { $id: 'u2', monthlyXP: 0, totalXP: 50, xp: 20, lastMonthlyReset: '2026-06' },
];

const leaderboardEntries: MonthlyResetLeaderboardRecord[] = [
  { $id: 'l1', userId: 'u1', monthlyXP: 120, month: '6', year: 2026, rank: 1 },
  { $id: 'l2', userId: 'u2', monthlyXP: 20, month: '6', year: 2026, rank: 2 },
];

const result = applyMonthlyLeaderboardReset({
  users,
  leaderboardEntries,
  resetDate,
});

assertEqual(
  result.userUpdates,
  [
    { $id: 'u1', monthlyXP: 0, lastMonthlyReset: '2026-06' },
    { $id: 'u2', monthlyXP: 0, lastMonthlyReset: '2026-06' },
  ],
  'resets monthly XP and advances the month key for every user'
);

assert(
  users[0].totalXP === 900 && users[0].xp === 450,
  'does not mutate source user lifetime XP values'
);

assertEqual(
  result.leaderboardUpdates,
  [
    { $id: 'l1', monthlyXP: 0, rank: 1, month: '6', year: 2026 },
    { $id: 'l2', monthlyXP: 0, rank: 2, month: '6', year: 2026 },
  ],
  'zeros current-month leaderboard entries without deleting the snapshot rows'
);

const emptyResult = applyMonthlyLeaderboardReset({
  users: [],
  leaderboardEntries: [],
  resetDate,
});

assertEqual(emptyResult.userUpdates, [], 'handles empty user lists');
assertEqual(emptyResult.leaderboardUpdates, [], 'handles empty leaderboard snapshots');
