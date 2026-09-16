const fs = require('fs');
const path = require('path');

const readScreen = (file) =>
  fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'game', file), 'utf8');

for (const file of [
  'LevelCompletionScreen.tsx',
  'AchievementUnlockScreen.tsx',
  'DailyQuestScreen.tsx',
]) {
  test(`${file} exposes the supplied single Continue action`, () => {
    const source = readScreen(file);
    expect(source).toContain('onContinue?: () => void');
    expect(source).toContain('styles.actionFooter');
    expect(source).toContain('title="Continue"');
    expect(source).not.toContain('Back to Home');
  });
}

test('CelebrationFlow owns the final Home destination without adding a second action', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'gamification', 'CelebrationFlow.tsx'),
    'utf8'
  );
  expect(source).toContain('const handleBackToHome');
  expect(source).toContain("navigation.navigate(\"MainApp\", { screen: \"Home\" })");
  expect(source).not.toContain('onBackToHome={handleBackToHome}');
});
