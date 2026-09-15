const fs = require('fs');
const path = require('path');

const readScreen = (file) =>
  fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'game', file), 'utf8');

for (const file of [
  'LevelCompletionScreen.tsx',
  'AchievementUnlockScreen.tsx',
  'DailyQuestScreen.tsx',
]) {
  test(`${file} exposes visible Continue and Back to Home actions`, () => {
    const source = readScreen(file);
    expect(source).toContain('onContinue?: () => void');
    expect(source).toContain('onBackToHome?: () => void');
    expect(source).toContain('Back to Home');
    expect(source).toContain('styles.actionFooter');
  });
}

test('CelebrationFlow owns the explicit Home exit', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'gamification', 'CelebrationFlow.tsx'),
    'utf8'
  );
  expect(source).toContain('const handleBackToHome');
  expect(source).toContain('onBackToHome={handleBackToHome}');
  expect(source).toContain("navigation.navigate(\"MainApp\", { screen: \"Home\" })");
});
