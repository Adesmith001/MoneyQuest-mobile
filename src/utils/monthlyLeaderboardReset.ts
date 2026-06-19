import { getMonthKey } from './monthlyXP';

export interface MonthlyResetUserRecord {
  $id: string;
  monthlyXP?: number;
  lastMonthlyReset?: string | null;
  xp?: number;
  totalXP?: number;
}

export interface MonthlyResetLeaderboardRecord {
  $id: string;
  userId?: string;
  monthlyXP?: number;
  month?: string | number;
  year?: number;
  rank?: number;
}

export interface MonthlyLeaderboardResetResult {
  userUpdates: Array<{
    $id: string;
    monthlyXP: number;
    lastMonthlyReset: string;
  }>;
  leaderboardUpdates: Array<{
    $id: string;
    monthlyXP: number;
    rank: number;
    month: string;
    year: number;
  }>;
}

export const getMonthlyResetMonthKey = (resetDate: Date = new Date()): string =>
  getMonthKey(resetDate);

export const applyMonthlyLeaderboardReset = ({
  users,
  leaderboardEntries,
  resetDate = new Date(),
}: {
  users: MonthlyResetUserRecord[];
  leaderboardEntries: MonthlyResetLeaderboardRecord[];
  resetDate?: Date;
}): MonthlyLeaderboardResetResult => {
  const monthKey = getMonthlyResetMonthKey(resetDate);
  const month = `${resetDate.getMonth() + 1}`;
  const year = resetDate.getFullYear();

  return {
    userUpdates: users.map((user) => ({
      $id: user.$id,
      monthlyXP: 0,
      lastMonthlyReset: monthKey,
    })),
    leaderboardUpdates: leaderboardEntries.map((entry, index) => ({
      $id: entry.$id,
      monthlyXP: 0,
      rank: entry.rank || index + 1,
      month: entry.month !== undefined ? `${entry.month}` : month,
      year: entry.year || year,
    })),
  };
};
