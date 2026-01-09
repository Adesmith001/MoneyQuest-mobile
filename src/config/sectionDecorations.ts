// Section-specific decorative elements configuration
// Each section can have unique floating decorations (emojis or images)

import { screenWidth } from "../utils";

export interface SectionDecoration {
  emoji?: string;
  imageSource?: any; // For custom images
  position: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  size?: number;
  rotation?: number;
  opacity?: number;
}

export interface SectionDecorationSet {
  decorations: SectionDecoration[];
}

export interface SectionTheme {
  decorations: SectionDecoration[];
  themeEmojis: string[];
}

// Map section titles/keywords to decoration themes
// This allows dynamic decoration based on section content
const DECORATION_THEMES: Record<string, string[]> = {
  needs: ['🏠', '🎈', '🛒', '💎', '🎁'],
  savings: ['💵', '🪙', '🐷', '💰', '🏦'],
  money: ['💴', '💶', '💷', '💵', '💸'],
  currency: ['💲', '₦', '£', '€', '¥'],
  budget: ['📊', '📝', '🧮', '📈', '✅'],
  investing: ['📈', '🏢', '💹', '🏆', '🚀'],
  banking: ['🏦', '💳', '🏧', '📱', '🔐'],
  earning: ['💼', '👔', '🛠️', '💡', '🎯'],
  shopping: ['🛍️', '🏷️', '💳', '🧾', '💸'],
  goals: ['🎯', '🏆', '⭐', '🌟', '🚀'],
  business: ['🏪', '📊', '💼', '🤝', '📈'],
  recap: ['📚', '🔄', '✨', '🧠', '🎓'],
  // Add more themes for future sections
  taxes: ['📄', '🧾', '💰', '🏛️', '📋'],
  insurance: ['🛡️', '🏥', '🚗', '🏠', '💼'],
  credit: ['💳', '📊', '🔢', '✅', '📈'],
  debt: ['📉', '💸', '🔗', '⚖️', '🆓'],
  retirement: ['👴', '🏖️', '⏰', '💰', '🌅'],
  realEstate: ['🏘️', '🏢', '🔑', '📍', '🏗️'],
  stocks: ['📊', '💹', '📈', '🔔', '💼'],
  crypto: ['₿', '⛓️', '💎', '🚀', '💻'],
  entrepreneurship: ['💡', '🚀', '📱', '🌟', '🏆'],
  marketing: ['📣', '🎯', '📱', '💡', '📊'],
  finance: ['💵', '📊', '💰', '🏦', '📈'],
  economics: ['📈', '🌍', '💱', '⚖️', '📊'],
  personal: ['👤', '💭', '🎯', '📝', '✨'],
  family: ['👨‍👩‍👧‍👦', '🏠', '❤️', '🍽️', '🎉'],
  education: ['📚', '🎓', '✏️', '🧠', '📖'],
  // Generic fallback themes
  learning: ['📚', '🧠', '💡', '✨', '🎓'],
  money_general: ['💰', '💵', '🪙', '💳', '📊'],
  success: ['🏆', '⭐', '🎯', '🚀', '💪'],
  growth: ['🌱', '📈', '🚀', '💪', '⬆️'],
  planning: ['📋', '📅', '🗓️', '✅', '🎯'],
};

// Expanded keyword mapping for better section matching
const THEME_KEYWORDS: Record<string, string> = {
  'need': 'needs',
  'want': 'needs',
  'distinguish': 'needs',
  'saving': 'savings',
  'save': 'savings',
  'piggy': 'savings',
  'money': 'money',
  'currency': 'currency',
  'dollar': 'currency',
  'naira': 'currency',
  'pound': 'currency',
  'euro': 'currency',
  'budget': 'budget',
  'plan': 'budget',
  'spending': 'budget',
  'invest': 'investing',
  'stock': 'stocks',
  'share': 'stocks',
  'bank': 'banking',
  'account': 'banking',
  'atm': 'banking',
  'earn': 'earning',
  'income': 'earning',
  'salary': 'earning',
  'job': 'earning',
  'shop': 'shopping',
  'buy': 'shopping',
  'purchase': 'shopping',
  'goal': 'goals',
  'target': 'goals',
  'aim': 'goals',
  'business': 'business',
  'entrepreneur': 'entrepreneurship',
  'startup': 'entrepreneurship',
  'recap': 'recap',
  'review': 'recap',
  'summary': 'recap',
  'tax': 'taxes',
  'insurance': 'insurance',
  'credit': 'credit',
  'debt': 'debt',
  'loan': 'debt',
  'retire': 'retirement',
  'pension': 'retirement',
  'property': 'realEstate',
  'house': 'realEstate',
  'real estate': 'realEstate',
  'crypto': 'crypto',
  'bitcoin': 'crypto',
  'blockchain': 'crypto',
  'market': 'marketing',
  'advertis': 'marketing',
  'finance': 'finance',
  'econom': 'economics',
  'personal': 'personal',
  'family': 'family',
  'educat': 'education',
  'learn': 'learning',
  'success': 'success',
  'grow': 'growth',
};

// Helper function to select theme based on section title
function selectThemeForSection(sectionTitle: string, sectionIndex: number): string[] {
  const titleLower = sectionTitle.toLowerCase();
  
  // Check for keyword matches first
  for (const [keyword, theme] of Object.entries(THEME_KEYWORDS)) {
    if (titleLower.includes(keyword)) {
      return DECORATION_THEMES[theme] || DECORATION_THEMES.learning;
    }
  }
  
  // If no keyword match, cycle through themes intelligently
  const themeKeys = Object.keys(DECORATION_THEMES);
  const cycleIndex = sectionIndex % themeKeys.length;
  const selectedTheme = themeKeys[cycleIndex];
  
  return DECORATION_THEMES[selectedTheme];
}

/**
 * Get decorations for a section based on its title
 * Matches keywords in the section title to decoration themes
 */
export function getDecorationsForSection(
  sectionTitle: string,
  sectionIndex: number
): SectionTheme {
  // Select appropriate theme
  const themeEmojis = selectThemeForSection(sectionTitle, sectionIndex);
  
  // Generate decoration positions (5 decorations per section)
  const decorations: SectionDecoration[] = themeEmojis.map((emoji, idx) => {
    // Distribute decorations evenly across the screen
    const positions = [
      { top: 180, left: 40, rotation: -15 },
      { top: 320, right: 30, rotation: 20 },
      { top: 460, left: screenWidth * 0.55, rotation: -10 },
      { top: 600, left: 50, rotation: 15 },
      { top: 740, right: 40, rotation: -20 },
    ];
    
    return {
      emoji,
      position: positions[idx] || positions[0],
      size: 40 + (idx % 2) * 5, // Vary sizes slightly
      opacity: 0.85 + (idx % 3) * 0.05, // Vary opacity slightly
      rotation: positions[idx]?.rotation || 0,
    };
  });

  return {
    decorations,
    themeEmojis,
  };
}

export default DECORATION_THEMES;
