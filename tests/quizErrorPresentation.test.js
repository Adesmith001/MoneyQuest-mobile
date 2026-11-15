const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/screens/game/QuestionScreen.tsx'), 'utf8');

assert.match(source, /\{!!quizStartError && \(\s*<ErrorModal[\s\S]*?onPress: handleStartQuiz/,
  'A quiz start error opens the modal with a retry action');
assert.match(source, /\{submissionError && !submissionError\.dismissed && \(\s*<ErrorModal[\s\S]*?onPress: handleContinue/,
  'A save error or unfinished result opens the modal with a retry action');
assert.match(source, /canRetrySubmission\s*=\s*Boolean\(submissionError\)/,
  'Dismissing the save error leaves the pending result eligible for retry');
assert.match(source, /onPress=\{canRetrySubmission \? handleContinue : handleSubmit\}/,
  'The quiz footer can retry saving a dismissed result');

console.log('Quiz error presentation checks passed');
