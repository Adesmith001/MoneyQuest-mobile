// App Colors (based on the Figma design - orange theme)
export const COLORS = {
  primary: '#FF5722',
  primaryDark: '#E64A19',
  primaryLight: '#FF8A65',
  secondary: '#FFC107',
  secondaryDark: '#FF8F00',
  secondaryLight: '#FFECB3',
  
  // Background colors
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  
  // Text colors
  text: '#212121',
  textSecondary: '#757575',
  textLight: '#BDBDBD',
  
  // Status colors
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Border and separator
  border: '#E0E0E0',
  separator: '#F0F0F0',
  
  // Transparent overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
};

// Typography
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  light: 'System',
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};

// Shadows
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

// Level Configuration
export const LEVEL_CONFIG = {
  SECTIONS_PER_LEVEL: 4,
  QUESTIONS_PER_SECTION: 5,
  XP_PER_QUESTION: {
    easy: 10,
    medium: 15,
    hard: 20,
  },
  XP_SECTION_BONUS: 50,
  XP_LEVEL_BONUS: 200,
};

// Streak Configuration
export const STREAK_CONFIG = {
  MAX_STREAK_DAYS: 365,
  STREAK_BONUS_XP: {
    7: 100,   // 1 week
    14: 250,  // 2 weeks
    30: 500,  // 1 month
    60: 1000, // 2 months
    100: 2000, // 100 days
  },
};

// Avatar Configuration
export const AVATAR_OPTIONS = [
  { id: 1, name: 'Male Professional', emoji: '👨‍💼' },
  { id: 2, name: 'Female Professional', emoji: '👩‍💼' },
  { id: 3, name: 'Male Student', emoji: '👨‍🎓' },
  { id: 4, name: 'Female Student', emoji: '👩‍🎓' },
  { id: 5, name: 'Male Teacher', emoji: '👨‍🏫' },
  { id: 6, name: 'Female Teacher', emoji: '👩‍🏫' },
  { id: 7, name: 'Male Scientist', emoji: '👨‍🔬' },
  { id: 8, name: 'Female Scientist', emoji: '👩‍🔬' },
  { id: 9, name: 'Male Artist', emoji: '👨‍🎨' },
  { id: 10, name: 'Female Artist', emoji: '👩‍🎨' },
];

// Level Themes and Topics
export const LEVEL_THEMES = {
  1: {
    title: 'Financial Basics',
    description: 'Learn the fundamentals of money management',
    sections: [
      { title: 'What is Money?', topic: 'money_basics' },
      { title: 'Saving vs Spending', topic: 'saving_spending' },
      { title: 'Banking Basics', topic: 'banking' },
      { title: 'Budgeting 101', topic: 'budgeting' },
    ],
  },
  2: {
    title: 'Smart Spending',
    description: 'Master the art of wise spending decisions',
    sections: [
      { title: 'Needs vs Wants', topic: 'needs_wants' },
      { title: 'Comparison Shopping', topic: 'shopping' },
      { title: 'Avoiding Debt', topic: 'debt_avoidance' },
      { title: 'Credit Basics', topic: 'credit_basics' },
    ],
  },
  3: {
    title: 'Investment Fundamentals',
    description: 'Start your investment journey',
    sections: [
      { title: 'What is Investing?', topic: 'investment_basics' },
      { title: 'Risk and Return', topic: 'risk_return' },
      { title: 'Stock Market Basics', topic: 'stocks' },
      { title: 'Diversification', topic: 'diversification' },
    ],
  },
  4: {
    title: 'Advanced Planning',
    description: 'Plan for your financial future',
    sections: [
      { title: 'Emergency Funds', topic: 'emergency_funds' },
      { title: 'Retirement Planning', topic: 'retirement' },
      { title: 'Insurance Basics', topic: 'insurance' },
      { title: 'Tax Fundamentals', topic: 'taxes' },
    ],
  },
};

// Animation Durations
export const ANIMATION_DURATION = {
  fast: 200,
  normal: 300,
  slow: 500,
  progress: 1000,
  avatar_move: 2000,
};

// Screen Dimensions
export const SCREEN = {
  width: 375, // Design width
  height: 812, // Design height
};

// API Endpoints (if you use external services)
export const API_ENDPOINTS = {
  AI_QUESTIONS: '/api/generate-questions',
  TTS: '/api/text-to-speech',
  ANALYTICS: '/api/analytics',
};