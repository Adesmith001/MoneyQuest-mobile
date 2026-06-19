import {
  getInitialSectionIndex,
  removeQuestionAtIndex,
  getLifeDeductionResult,
  getLevelCompletionLives,
  getCurrentStreakFromHistory,
  selectLeaderboardStreak,
  shouldSendLivesRestoredNotification,
  getLevelProgressState,
  getRecapLevelProgressState,
  getRecapSectionNumberForCompletedRegularSections,
  getTopFirstLevelRenderItems,
  resolveRecapSourceLevelIds,
  getSectionPlayableLevelId,
  isLevelEnterable,
  getNextPlayableLevelTarget,
} from '../src/utils/progressBehavior';

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const assertArrayEqual = <T>(actual: T[], expected: T[], message: string) => {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

const assertProgressState = (
  actual: { isUnlocked: boolean; isCompleted: boolean; isCurrent: boolean },
  expected: { isUnlocked: boolean; isCompleted: boolean; isCurrent: boolean },
  message: string
) => {
  if (
    actual.isUnlocked !== expected.isUnlocked ||
    actual.isCompleted !== expected.isCompleted ||
    actual.isCurrent !== expected.isCurrent
  ) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

assertEqual(
  getInitialSectionIndex(
    [{ id: 'section-1' }, { id: 'section-15' }, { id: 'section-16' }],
    'section-15',
    0
  ),
  1,
  'prefers the saved current section over the default first section'
);

assertEqual(
  getInitialSectionIndex([{ id: 'section-1' }], 'missing-section', 0),
  0,
  'falls back to the current active index when saved section is unavailable'
);

assertArrayEqual(
  removeQuestionAtIndex(['q1', 'q2', 'q3'], 1).questions,
  ['q1', 'q3'],
  'removes a flagged question from the active quiz list'
);

assertEqual(
  removeQuestionAtIndex(['q1', 'q2', 'q3'], 2).nextIndex,
  1,
  'moves to the previous available index when the last question is removed'
);

assertEqual(
  shouldSendLivesRestoredNotification(4, 5, 'passive-refresh'),
  false,
  'does not send immediate restored notification during passive refresh'
);

assertEqual(
  shouldSendLivesRestoredNotification(4, 5, 'scheduled-trigger'),
  true,
  'allows restored notification for an explicit scheduled trigger'
);

const deductionFromFull = getLifeDeductionResult(5, '2026-05-27T08:00:00.000Z', '2026-05-28T08:00:00.000Z');
assertEqual(
  deductionFromFull.lives,
  4,
  'deducts one life from full health'
);
assertEqual(
  deductionFromFull.lastLifeRegenTime,
  '2026-05-28T08:00:00.000Z',
  'starts the regeneration timer when a life is deducted from full health'
);

assertEqual(
  getLevelCompletionLives(4),
  5,
  'grants one life when a level is completed'
);

assertEqual(
  getLevelCompletionLives(5),
  5,
  'does not grant more than the maximum lives'
);

assertEqual(
  selectLeaderboardStreak({ currentStreak: 1, weeklyStreak: 3 }),
  1,
  'leaderboard uses current streak instead of weekly streak'
);

assertEqual(
  getCurrentStreakFromHistory(['2026-05-25', '2026-05-26', '2026-05-27'], '2026-05-27'),
  3,
  'derives current streak from consecutive login history days'
);

assertEqual(
  getCurrentStreakFromHistory(['2026-05-24', '2026-05-25'], '2026-05-27'),
  0,
  'returns zero when the user was not active today'
);

assertProgressState(
  getLevelProgressState({
    sectionId: 'section-1',
    levelId: 'level-1',
    levelIndex: 0,
    sectionLevelIds: ['level-1', 'level-2'],
    completedLevelIds: new Set(['level-1']),
    currentSectionId: 'section-1',
    currentLevelId: 'level-2',
  }),
  { isUnlocked: true, isCompleted: true, isCurrent: false },
  'keeps a completed level unlocked after the user leaves and returns'
);

assertProgressState(
  getLevelProgressState({
    sectionId: 'section-1',
    levelId: 'level-2',
    levelIndex: 1,
    sectionLevelIds: ['level-1', 'level-2'],
    completedLevelIds: new Set(['level-1']),
    currentSectionId: 'section-1',
    currentLevelId: 'level-2',
  }),
  { isUnlocked: true, isCompleted: false, isCurrent: true },
  'unlocks the next level when the previous level in the section is completed'
);

assertProgressState(
  getLevelProgressState({
    sectionId: 'section-1',
    levelId: 'level-3',
    levelIndex: 2,
    sectionLevelIds: ['level-1', 'level-2', 'level-3'],
    completedLevelIds: new Set(['level-2']),
    currentSectionId: 'section-1',
    currentLevelId: 'level-2',
  }),
  { isUnlocked: false, isCompleted: false, isCurrent: false },
  'keeps later levels locked when an earlier level in the section was skipped'
);

assertProgressState(
  getRecapLevelProgressState({
    recapSectionId: 'recap-10',
    recapLevelId: 'recap-10-source-1',
    recapLevelIndex: 0,
    recapLevelIds: ['recap-10-source-1', 'recap-10-source-2'],
    sourceLevelIds: ['level-1', 'level-2'],
    completedLevelIds: new Set(['level-1', 'level-2']),
  }),
  { isUnlocked: true, isCompleted: false, isCurrent: false },
  'opens a generated recap review when its source section is completed'
);

assertProgressState(
  getRecapLevelProgressState({
    recapSectionId: 'recap-10',
    recapLevelId: 'recap-10-source-1',
    recapLevelIndex: 0,
    recapLevelIds: ['recap-10-source-1', 'recap-10-source-2'],
    sourceLevelIds: ['level-1', 'level-2'],
    completedLevelIds: new Set(['level-1', 'level-2', 'recap-10-source-1']),
  }),
  { isUnlocked: true, isCompleted: true, isCurrent: false },
  'keeps a completed generated recap review unlocked'
);

assertProgressState(
  getRecapLevelProgressState({
    recapSectionId: 'recap-10',
    recapLevelId: 'recap-10-source-2',
    recapLevelIndex: 1,
    recapLevelIds: ['recap-10-source-1', 'recap-10-source-2'],
    sourceLevelIds: ['level-3', 'level-4'],
    completedLevelIds: new Set(['level-3', 'level-4']),
  }),
  { isUnlocked: true, isCompleted: false, isCurrent: false },
  'unlocks a recap level when its own source section is completed'
);

assertProgressState(
  getRecapLevelProgressState({
    recapSectionId: 'recap-10',
    recapLevelId: 'recap-10-source-2',
    recapLevelIndex: 1,
    recapLevelIds: ['recap-10-source-1', 'recap-10-source-2'],
    sourceLevelIds: ['level-3', 'level-4'],
    completedLevelIds: new Set(['level-3', 'level-4', 'recap-10-source-1']),
  }),
  { isUnlocked: true, isCompleted: false, isCurrent: false },
  'unlocks the next recap level once its source section and the previous recap level are complete'
);

assertEqual(
  getRecapSectionNumberForCompletedRegularSections(9),
  10,
  'creates the first recap after nine real sections'
);

assertEqual(
  getRecapSectionNumberForCompletedRegularSections(18),
  20,
  'creates the second recap after eighteen real sections'
);

assertEqual(
  getRecapSectionNumberForCompletedRegularSections(10),
  null,
  'does not create recap sections between nine-section groups'
);

const topFirstRenderItems = getTopFirstLevelRenderItems(['level-1', 'level-2', 'level-3']);
assertArrayEqual(
  topFirstRenderItems.map((item) => item.node),
  ['level-1', 'level-2', 'level-3'],
  'renders the first level at the top of the section'
);

assertArrayEqual(
  topFirstRenderItems.map((item) => item.pathIndex),
  [0, 1, 2],
  'keeps level path indexes aligned with top-first visual order'
);

assertArrayEqual(
  topFirstRenderItems.map((item) => item.isLast),
  [false, false, true],
  'only treats the bottom level as the last path node'
);

assertArrayEqual(
  resolveRecapSourceLevelIds({
    sourceSectionId: 'backend-section-1',
    sourceSectionNumber: 1,
    sourceSectionTitle: 'Needs and Wants',
    builtSections: [
      {
        id: 'generated-section-id',
        title: 'Needs and Wants',
        regularSectionNumber: 1,
        levels: [{ levelId: 'needs-1' }, { levelId: 'needs-2' }],
      },
    ],
  }),
  ['needs-1', 'needs-2'],
  'finds recap source levels by section number or title when backend ids differ'
);

assertEqual(
  getSectionPlayableLevelId(['level-1', 'level-2', 'level-3'], new Set(['level-1'])),
  'level-2',
  'resolves the first incomplete level in a section as the only playable one'
);

assertEqual(
  getSectionPlayableLevelId(['level-1', 'level-2'], new Set(['level-1', 'level-2'])),
  null,
  'returns null when every level in a section is already complete'
);

assertEqual(
  isLevelEnterable({
    targetLevelId: 'level-3',
    sectionLevelIds: ['level-1', 'level-2', 'level-3'],
    completedLevelIds: new Set(['level-1']),
  }),
  false,
  'rejects navigation to a later locked level'
);

assertEqual(
  isLevelEnterable({
    targetLevelId: 'level-2',
    sectionLevelIds: ['level-1', 'level-2', 'level-3'],
    completedLevelIds: new Set(['level-1']),
  }),
  true,
  'allows navigation to the current playable level'
);

assertEqual(
  isLevelEnterable({
    targetLevelId: 'level-1',
    sectionLevelIds: ['level-1', 'level-2', 'level-3'],
    completedLevelIds: new Set(['level-1']),
  }),
  true,
  'keeps completed levels replayable'
);

const nextRegularTarget = getNextPlayableLevelTarget({
  currentSectionId: 'section-1',
  completedLevelIds: new Set(['level-1', 'level-2']),
  regularSections: [
    { id: 'section-1', levelIds: ['level-1', 'level-2'] },
    { id: 'section-2', levelIds: ['level-3', 'level-4'] },
  ],
});

assertEqual(
  nextRegularTarget?.sectionId ?? null,
  'section-2',
  'unlocks the next regular section after finishing the current section'
);

assertEqual(
  nextRegularTarget?.levelId ?? null,
  'level-3',
  'targets the first level of the next regular section after section completion'
);

const ignoresRecapTarget = getNextPlayableLevelTarget({
  currentSectionId: 'section-1',
  completedLevelIds: new Set(['level-1', 'level-2']),
  regularSections: [
    { id: 'section-1', levelIds: ['level-1', 'level-2'] },
    { id: 'section-2', levelIds: ['level-3', 'level-4'] },
  ],
});

assertEqual(
  ignoresRecapTarget?.levelId ?? null,
  'level-3',
  'does not require recap content before advancing to the next regular section'
);
