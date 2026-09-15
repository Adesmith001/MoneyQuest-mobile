import { BadgeCatalogueEntry, BadgeCategory } from '../types/gamification';

export const BADGE_CATEGORY_ORDER: BadgeCategory[] = [
  'JOURNEY',
  'SECTION',
  'CONSISTENCY',
  'ACHIEVEMENT',
  'QUEST',
];

export interface BadgeCategoryGroup {
  category: BadgeCategory;
  items: BadgeCatalogueEntry[];
  earnedCount: number;
  totalCount: number;
}

export const groupBadgesByCategory = (
  badges: BadgeCatalogueEntry[]
): BadgeCategoryGroup[] =>
  BADGE_CATEGORY_ORDER.map((category) => {
    const items = badges.filter((badge) => badge.category === category);
    return {
      category,
      items,
      earnedCount: items.filter((badge) => badge.is_earned).length,
      totalCount: items.length,
    };
  });
