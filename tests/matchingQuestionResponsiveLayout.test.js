const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'components', 'questions', 'MatchingQuestion.tsx'),
  'utf8'
);

test('matching cards show complete text and share each row height', () => {
  expect(source).not.toContain('numberOfLines={2}');
  expect(source).toContain('styles.matchItemWrapper,');
  expect(source).toMatch(/matchItemWrapper:\s*\{\s*flex:\s*1/);
  expect(source).toMatch(/matchRow:\s*\{[\s\S]*?alignItems:\s*'stretch'/);
  expect(source).toMatch(/matchItem:\s*\{\s*flex:\s*1/);
});
