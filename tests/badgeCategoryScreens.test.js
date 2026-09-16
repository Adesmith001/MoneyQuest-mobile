const fs = require('fs');
const path = require('path');

const read = (...segments) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

test('Profile renders category summary cards instead of a flat badge slice', () => {
  const source = read('src', 'screens', 'main', 'ProfileScreen.tsx');
  expect(source).toContain('groupBadgesByCategory');
  expect(source).toContain('categoryGroups.map');
  expect(source).toContain('BadgeCatalogue", { category: group.category }');
  expect(source).not.toContain('badgeCatalogue.slice(0, 6)');
});

test('Badge catalogue renders a focused hexagon grid followed by category summaries', () => {
  const source = read('src', 'screens', 'game', 'BadgeCatalogueScreen.tsx');
  expect(source).toContain('groupBadgesByCategory');
  expect(source).toContain('categoryGroups.map');
  expect(source).toContain('activeGroup.items.map');
  expect(source).toContain('BadgeHexagon');
  expect(source).toContain('{group.earnedCount}/{group.totalCount}');
  expect(source).not.toContain('numberOfLines={1}');
});
