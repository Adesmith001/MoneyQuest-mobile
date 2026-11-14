const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/screens/game/QuestionScreen.tsx'), 'utf8');

assert.match(source, /usesModalErrors\s*=.+Platform\.OS.+windowWidth/,
  'Phones and narrow web viewports use a modal');
assert.match(source, /usesModalErrors && quizStartError && \(\s*<QuizErrorModal[\s\S]*?onRetry=\{handleStartQuiz\}/,
  'A quiz start error opens the modal with a retry action');
assert.match(source, /usesModalErrors && submissionError && !submissionError\.dismissed && \(\s*<QuizErrorModal[\s\S]*?onRetry=\{handleContinue\}/,
  'A save error or unfinished result opens the modal with a retry action');
assert.match(source, /canRetrySubmission\s*=\s*usesModalErrors && Boolean\(submissionError\)/,
  'Dismissing the save error leaves the pending result eligible for retry');
assert.match(source, /onPress=\{canRetrySubmission \? handleContinue : handleSubmit\}/,
  'The quiz footer can retry saving a dismissed result');
assert.match(source, /!usesModalErrors && quizStartError && <Text/);
assert.match(source, /!usesModalErrors && submissionError && \(\s*<View/);

console.log('Quiz error presentation checks passed');
