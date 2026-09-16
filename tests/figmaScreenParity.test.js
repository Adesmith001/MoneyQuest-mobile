const fs = require('fs');
const path = require('path');

const read = (...segments) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

test('the chest tab opens the full quests screen', () => {
  const source = read('src', 'navigation', 'MainTabNavigator.tsx');

  expect(source).toContain('name="Quests"');
  expect(source).toContain('component={QuestsScreen}');
  expect(source).toContain('require("../../assets/chestIcon.png")');
});

test('the quests screen only renders dashboard-backed quest content', () => {
  const source = read('src', 'screens', 'game', 'QuestsScreen.tsx');
  const active = source.indexOf('Active Challenges');
  const hall = source.indexOf('Hall of Fame');

  expect(active).toBeGreaterThan(-1);
  expect(hall).toBeGreaterThan(active);
  expect(source).not.toContain('Locked Adventures');
  expect(source).not.toContain('Level 5 Ascension');
  expect(source).not.toContain('Intro to Assets');
  expect(source).not.toContain('Prosperity Chest');
  expect(source).toContain('Complete More quest');
  expect(source).not.toContain('>Chests<');
});

test('post-lesson screens use one visible Continue action', () => {
  for (const file of [
    'LevelCompletionScreen.tsx',
    'AchievementUnlockScreen.tsx',
    'DailyQuestScreen.tsx',
  ]) {
    const source = read('src', 'screens', 'game', file);
    expect(source).toContain('title="Continue"');
    expect(source).not.toContain('Back to Home');
    expect(source).not.toContain('styles.nextPrompt');
  }
});

test('profile supports the supplied empty badge state and Figma category order', () => {
  const source = read('src', 'screens', 'main', 'ProfileScreen.tsx');

  expect(source).toContain('No Badge/Achievement Yet');
  expect(source).toContain('Go To Lessons');
  expect(source).toContain('PROFILE_BADGE_CATEGORY_ORDER');
  expect(source).toContain('BadgeHexagon');
  expect(source).toContain('contentContainerStyle={styles.profileScrollContent}');
  expect(source).toContain('profileScrollContent:');
});

test('badge catalogue uses the shared hexagon artwork treatment', () => {
  const source = read('src', 'screens', 'game', 'BadgeCatalogueScreen.tsx');

  expect(source).toContain('BadgeHexagon');
  expect(source).toContain('{group.earnedCount}/{group.totalCount}');
  expect(source).not.toContain('styles.badgeDescription');
  expect(source).not.toContain('styles.unlockPanel');
});
