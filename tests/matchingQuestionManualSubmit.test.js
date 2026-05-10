const fs = require('fs');
const path = require('path');

const readSource = (...segments) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

test('matching questions do not auto-submit after the final pair is matched', () => {
  const matchingQuestionSource = readSource(
    'src',
    'components',
    'questions',
    'MatchingQuestion.tsx'
  );
  const questionScreenSource = readSource(
    'src',
    'screens',
    'game',
    'QuestionScreen.tsx'
  );

  expect(matchingQuestionSource).not.toContain('onAutoAdvance');
  expect(questionScreenSource).not.toContain('shouldAutoSubmitMatching');
  expect(questionScreenSource).not.toContain('onAutoAdvance=');
});
