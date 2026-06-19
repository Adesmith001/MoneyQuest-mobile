/**
 * Get a month key in YYYY-MM format.
 */
export const getMonthKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Get the current month key (e.g., "2026-05").
 */
export const getCurrentMonthKey = (): string => getMonthKey();

export const normalizeMonthKey = (monthKey?: string | null): string | null => {
  if (!monthKey) {
    return null;
  }

  const match = /^(\d{4})-(\d{1,2})$/.exec(monthKey.trim());
  if (!match) {
    return null;
  }

  const [, year, month] = match;
  return `${year}-${month.padStart(2, '0')}`;
};

/**
 * Monthly XP should be treated as stale whenever the last reset marker does
 * not match the current month.
 */
export const shouldResetMonthlyXP = (
  lastMonthlyReset?: string | null,
  now: Date = new Date()
): boolean => {
  const normalizedMonthKey = normalizeMonthKey(lastMonthlyReset);
  if (!normalizedMonthKey) {
    return false;
  }

  return normalizedMonthKey !== getMonthKey(now);
};
