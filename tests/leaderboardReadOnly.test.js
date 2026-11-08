const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/store/slices/leaderboardSlice.ts'),
  'utf8',
);

assert.doesNotMatch(
  source,
  /syncLeaderboardSnapshot|databases\.(createDocument|updateDocument)/,
  'leaderboard refreshes must not write snapshots from each client',
);
assert.match(source, /COLLECTIONS\.USERS/, 'leaderboard still reads live user XP');
assert.match(source, /COLLECTIONS\.STREAKS/, 'leaderboard still reads live streak data');

console.log('leaderboardReadOnly: passed');
