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

test('Badge catalogue renders grouped sections with names, descriptions, and earned wording', () => {
  const source = read('src', 'screens', 'game', 'BadgeCatalogueScreen.tsx');
  expect(source).toContain('groupBadgesByCategory');
  expect(source).toContain('categoryGroups.map');
  expect(source).toContain('{badge.description}');
  expect(source).toContain('badges earned');
  expect(source).not.toContain('numberOfLines={1}');
});
