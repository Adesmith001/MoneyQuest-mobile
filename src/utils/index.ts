import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive dimensions based on design
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const scale = (size: number): number => (screenWidth / guidelineBaseWidth) * size;
export const verticalScale = (size: number): number => (screenHeight / guidelineBaseHeight) * size;
export const moderateScale = (size: number, factor: number = 0.5): number =>
  size + (scale(size) - size) * factor;

// Percentage-based dimensions
export const widthPercentageToDP = (widthPercent: string | number): number => {
  const elemWidth = typeof widthPercent === 'number' ? widthPercent : parseFloat(widthPercent);
  return (screenWidth * elemWidth) / 100;
};

export const heightPercentageToDP = (heightPercent: string | number): number => {
  const elemHeight = typeof heightPercent === 'number' ? heightPercent : parseFloat(heightPercent);
  return (screenHeight * elemHeight) / 100;
};

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