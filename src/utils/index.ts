import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive dimensions based on design
const guidelineBaseWidth = 375; // iPhone 11 Pro width
const guidelineBaseHeight = 812; // iPhone 11 Pro height

// Detect device type
export const isTablet = () => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = screenWidth * pixelDensity;
  const adjustedHeight = screenHeight * pixelDensity;
  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
    return true;
  }
  return (screenWidth >= 768 || screenHeight >= 768);
};

export const isSmallDevice = () => screenWidth < 375;
export const isMediumDevice = () => screenWidth >= 375 && screenWidth < 414;
export const isLargeDevice = () => screenWidth >= 414;

// Scale functions for responsive sizing
export const scale = (size: number): number => (screenWidth / guidelineBaseWidth) * size;
export const verticalScale = (size: number): number => (screenHeight / guidelineBaseHeight) * size;
export const moderateScale = (size: number, factor: number = 0.5): number =>
  size + (scale(size) - size) * factor;

// Responsive font sizing
export const fontScale = (size: number): number => {
  if (isTablet()) {
    return size * 1.2; // Increase font size for tablets
  }
  return moderateScale(size, 0.25);
};

// Percentage-based dimensions
export const widthPercentageToDP = (widthPercent: string | number): number => {
  const elemWidth = typeof widthPercent === 'number' ? widthPercent : parseFloat(widthPercent);
  return (screenWidth * elemWidth) / 100;
};

export const heightPercentageToDP = (heightPercent: string | number): number => {
  const elemHeight = typeof heightPercent === 'number' ? heightPercent : parseFloat(heightPercent);
  return (screenHeight * elemHeight) / 100;
};

// Get safe dimensions for content
export const getResponsivePadding = (): number => {
  if (isTablet()) return 48;
  if (isSmallDevice()) return 16;
  return 32;
};

export const getResponsiveMargin = (): number => {
  if (isTablet()) return 32;
  if (isSmallDevice()) return 12;
  return 24;
};

// Export screen dimensions
export { screenWidth, screenHeight };

// Screen dimensions
export const SCREEN_WIDTH = screenWidth;
export const SCREEN_HEIGHT = screenHeight;

// Utility functions
export const formatXP = (xp: number): string => {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  } else if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
};

export const formatPercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

export const calculateLevel = (xp: number): number => {
  // Simple level calculation - can be made more complex
  return Math.floor(xp / 1000) + 1;
};

export const calculateXPForNextLevel = (currentLevel: number): number => {
  return currentLevel * 1000;
};

export const calculateProgress = (current: number, total: number): number => {
  if (total === 0) return 0;
  return Math.min(current / total, 1);
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatStreak = (streak: number): string => {
  if (streak === 0) return 'Start your streak!';
  if (streak === 1) return '1 day streak';
  return `${streak} day streak`;
};

export const getStreakEmoji = (streak: number): string => {
  if (streak === 0) return '⭐';
  if (streak < 7) return '🔥';
  if (streak < 30) return '💪';
  if (streak < 100) return '🏆';
  return '👑';
};

export const getPerformanceEmoji = (percentage: number): string => {
  if (percentage >= 90) return '🏆';
  if (percentage >= 80) return '🥇';
  if (percentage >= 70) return '🥈';
  if (percentage >= 60) return '🥉';
  if (percentage >= 50) return '👍';
  return '💪';
};

export const getPerformanceMessage = (percentage: number): string => {
  if (percentage >= 90) return 'Outstanding! You\'re a financial genius!';
  if (percentage >= 80) return 'Excellent work! Keep it up!';
  if (percentage >= 70) return 'Great job! You\'re doing well!';
  if (percentage >= 60) return 'Good effort! Keep practicing!';
  if (percentage >= 50) return 'Not bad! Room for improvement!';
  return 'Keep trying! Practice makes perfect!';
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

// ============================================
// XP MANAGEMENT UTILITIES
// ============================================

/**
 * Check if it's a new month compared to last update
 * @param lastUpdateDate - ISO string of last update
 * @returns True if current month is different from last update
 */
export const isNewMonth = (lastUpdateDate: string): boolean => {
  const lastUpdate = new Date(lastUpdateDate);
  const now = new Date();
  
  return (
    lastUpdate.getMonth() !== now.getMonth() ||
    lastUpdate.getFullYear() !== now.getFullYear()
  );
};

export { getCurrentMonthKey, getMonthKey, normalizeMonthKey, shouldResetMonthlyXP } from './monthlyXP';
export { applyMonthlyLeaderboardReset, getMonthlyResetMonthKey } from './monthlyLeaderboardReset';

/**
 * Get month name from month key
 * @param monthKey - Month key (e.g., "2025-11")
 * @returns Month name (e.g., "November 2025")
 */
export const getMonthNameFromKey = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
};

/**
 * Calculate days until month end
 * @returns Number of days remaining in current month
 */
export const getDaysUntilMonthEnd = (): number => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  return lastDayOfMonth - currentDay;
};

/**
 * Format XP with monthly reset info
 * @param monthlyXP - XP for current month
 * @param totalXP - Total lifetime XP
 * @returns Formatted string
 */
export const formatMonthlyXP = (monthlyXP: number, totalXP: number): string => {
  const daysLeft = getDaysUntilMonthEnd();
  return `${formatXP(monthlyXP)} XP this month (${daysLeft} days left)`;
};

/**
 * Calculate XP needed to reach a rank on leaderboard
 * @param currentXP - User's current XP
 * @param targetRankXP - XP of user at target rank
 * @returns XP difference
 */
export const calculateXPToRank = (currentXP: number, targetRankXP: number): number => {
  return Math.max(0, targetRankXP - currentXP);
};

// ============================================
// LIVES MANAGEMENT UTILITIES
// ============================================

/**
 * Format lives display (e.g., "3/5 ❤️")
 * @param currentLives - Current lives
 * @param maxLives - Maximum lives (default: 5)
 * @returns Formatted string
 */
export const formatLives = (currentLives: number, maxLives: number = 5): string => {
  const hearts = '❤️'.repeat(currentLives) + '🤍'.repeat(maxLives - currentLives);
  return `${hearts} (${currentLives}/${maxLives})`;
};

/**
 * Format time until next life
 * @param milliseconds - Time in milliseconds
 * @returns Formatted string like "1h 45m" or "Full"
 */
export const formatLifeRegenTime = (milliseconds: number): string => {
  if (milliseconds === 0) {
    return 'Full';
  }

  const totalSeconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};
