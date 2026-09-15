import { groupBadgesByCategory } from '../src/utils/badgeCategories';
import { BadgeCatalogueEntry, BadgeCategory } from '../src/types/gamification';

const assertEqual = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
};

const badge = (category: BadgeCategory, code: string, isEarned = false): BadgeCatalogueEntry => ({
  badge_definition_id: code,
  code,
  name: code,
  description: `${code} description`,
  category,
  asset_reference: null,
  is_earned: isEarned,
  progress_value: isEarned ? 1 : 0,
  target_value: 1,
  awarded_at: isEarned ? '2026-09-15T00:00:00Z' : null,
});

const groups = groupBadgesByCategory([
  badge('QUEST', 'quest'),
  badge('ACHIEVEMENT', 'achievement'),
  badge('JOURNEY', 'journey', true),
  badge('CONSISTENCY', 'consistency'),
  badge('SECTION', 'section'),
]);

assertEqual(
  groups.map((group) => group.category).join(','),
  'JOURNEY,SECTION,CONSISTENCY,ACHIEVEMENT,QUEST',
  'uses PRD category order and leaves legacy Quest last'
);
assertEqual(groups[0].earnedCount, 1, 'counts earned badges per category');
assertEqual(groups[0].totalCount, 1, 'counts total badges per category');

const emptyGroups = groupBadgesByCategory([]);
assertEqual(emptyGroups.length, 5, 'keeps every badge classification visible before it is earned');
assertEqual(emptyGroups[2].totalCount, 0, 'empty classifications report zero badges');
