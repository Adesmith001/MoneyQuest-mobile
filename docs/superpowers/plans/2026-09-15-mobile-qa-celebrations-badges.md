# Mobile QA Celebrations and Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make matching questions readable on phones and make the supplied celebration and categorized-badge designs fully navigable.

**Architecture:** Keep the existing Question → CelebrationFlow → Home route. Correct the reusable presentation helpers first, then make each screen responsive with a scrollable content region and a fixed action footer; derive category summaries from the existing badge catalogue instead of adding state or endpoints.

**Tech Stack:** React Native 0.81, Expo 54, Redux Toolkit, React Navigation 7, TypeScript, Jest/static regression checks, Python pytest for existing backend gamification coverage.

---

### Task 1: Matching cards grow with complete text

**Files:**
- Create: `tests/matchingQuestionResponsiveLayout.test.js`
- Modify: `src/components/questions/MatchingQuestion.tsx`
- Modify: `src/screens/game/QuestionScreen.tsx`

- [ ] **Step 1: Write the failing regression check**

```js
test('matching cards show complete text and rows stretch evenly', () => {
  const source = readSource('src', 'components', 'questions', 'MatchingQuestion.tsx');
  expect(source).not.toMatch(/numberOfLines=\{2\}/);
  expect(source).toContain('alignItems: \'stretch\'');
  expect(source).toContain('flex: 1');
});
```

- [ ] **Step 2: Run it and verify RED**

Run: `pnpm exec jest tests/matchingQuestionResponsiveLayout.test.js --runInBand`

Expected: FAIL because text is clamped and rows/cards do not share the available row height.

- [ ] **Step 3: Implement the minimum responsive layout**

Remove `numberOfLines` from both matching labels, stretch each row/column/animated wrapper, give cards `flex: 1`, and replace the fixed large vertical gaps with phone-safe spacing. Ensure the matching variant of QuestionScreen uses its existing outer vertical scrolling rather than clipping expanded rows.

- [ ] **Step 4: Run the focused test and existing manual-submit/style tests**

Run: `pnpm exec jest tests/matchingQuestionResponsiveLayout.test.js tests/matchingQuestionManualSubmit.test.js --runInBand` and compile/run `tests/matchingQuestionStyleState.test.ts` with the repository's TypeScript test pattern.

Expected: all focused checks pass.

### Task 2: Build a unique celebration queue

**Files:**
- Modify: `tests/gamificationPresentation.test.ts`
- Modify: `src/utils/gamificationPresentation.ts`

- [ ] **Step 1: Add a failing combined-payload test**

```ts
const combined = buildCelebrationsFromBundle({
  ...bundle,
  primary_celebration: {
    celebration_type: 'BADGE_UNLOCK', hero_element: 'badge', xp_earned: 10,
    streak_status: null, next_badge_progress: null,
    unlocked_badges: ['FIRST_STEP'], completed_quests: ['RAPID_FIRE'], section_completion: null,
  },
});
assertEqual(combined.length, 2, 'combined primary payload does not duplicate explicit results');
assertEqual(combined[0].unlocked_badges[0], 'FIRST_STEP', 'badge is first');
assertEqual(combined[1].completed_quests[0], 'RAPID_FIRE', 'quest is second');
```

- [ ] **Step 2: Compile and run it to verify RED**

Expected: FAIL with length 3 because the primary payload duplicates explicit entries.

- [ ] **Step 3: Implement fallback-only primary handling**

Build badge, quest, and chest celebrations from explicit result arrays. Append `primary_celebration` only when none of those arrays produced a celebration. Preserve badge-before-quest-before-chest ordering.

- [ ] **Step 4: Re-run the test**

Expected: PASS.

### Task 3: Categorize badge data once

**Files:**
- Create: `src/utils/badgeCategories.ts`
- Create: `tests/badgeCategories.test.ts`

- [ ] **Step 1: Write the failing pure-function test**

```ts
const groups = groupBadgesByCategory(badges);
assertEqual(groups.map(group => group.category).join(','),
  'JOURNEY,SECTION,CONSISTENCY,ACHIEVEMENT,QUEST',
  'uses PRD category order and leaves legacy Quest last');
assertEqual(groups[0].earnedCount, 1, 'counts earned badges per category');
```

- [ ] **Step 2: Compile and run it to verify RED**

Expected: compile failure because `groupBadgesByCategory` does not exist.

- [ ] **Step 3: Implement the helper**

```ts
export const BADGE_CATEGORY_ORDER: BadgeCategory[] = [
  'JOURNEY', 'SECTION', 'CONSISTENCY', 'ACHIEVEMENT', 'QUEST',
];

export const groupBadgesByCategory = (badges: BadgeCatalogueEntry[]) =>
  BADGE_CATEGORY_ORDER.map(category => {
    const items = badges.filter(badge => badge.category === category);
    return { category, items, earnedCount: items.filter(item => item.is_earned).length };
  }).filter(group => group.items.length > 0);
```

- [ ] **Step 4: Re-run the test**

Expected: PASS.

### Task 4: Make every post-lesson action visible and explicit

**Files:**
- Create: `tests/postLessonActions.test.js`
- Modify: `src/components/gamification/CelebrationFlow.tsx`
- Modify: `src/screens/game/LevelCompletionScreen.tsx`
- Modify: `src/screens/game/AchievementUnlockScreen.tsx`
- Modify: `src/screens/game/DailyQuestScreen.tsx`

- [ ] **Step 1: Write a failing screen-contract test**

```js
for (const file of ['LevelCompletionScreen.tsx', 'AchievementUnlockScreen.tsx', 'DailyQuestScreen.tsx']) {
  const source = readGameScreen(file);
  expect(source).toContain('Back to Home');
  expect(source).toContain('onBackToHome');
}
```

- [ ] **Step 2: Run it and verify RED**

Expected: FAIL because none of the three screens exposes the explicit Home action.

- [ ] **Step 3: Implement flow navigation**

Add `onContinue` and `onBackToHome` props to the three presentation screens while retaining navigation fallbacks for direct routes. In CelebrationFlow, `onContinue` advances the sequence and `onBackToHome` clears pending celebrations then calls `navigation.navigate('MainApp', { screen: 'Home' })`.

- [ ] **Step 4: Match the supplied phone layouts**

For each screen, retain the supplied orange header, hero art, white content area, typography, progress cards, and mascot/quest/badge artwork. Put content in a flexing ScrollView and render a non-scrolling footer containing the primary action, a short next-step prompt, and a text-style `Back to Home` action. Use the real `streakMessage`; omit the streak card when it is null.

- [ ] **Step 5: Run the contract and celebration tests**

Expected: PASS.

### Task 5: Replace flat badges with PRD categories

**Files:**
- Modify: `src/screens/main/ProfileScreen.tsx`
- Modify: `src/screens/game/BadgeCatalogueScreen.tsx`
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Extend the badge regression test**

Assert Profile imports `groupBadgesByCategory`, category cards navigate with `{ category }`, and BadgeCatalogue renders category sections with full badge descriptions and the exact overall wording `badges earned`.

- [ ] **Step 2: Run it and verify RED**

Expected: FAIL because Profile still slices a flat list and the route has no category parameter.

- [ ] **Step 3: Implement category summary cards on Profile**

Map grouped badge data into ZIP-inspired coloured summary cards. Each card renders category title, concise category description, earned/total count, up to three earned-or-locked previews, and a chevron. Preserve the empty-state Go To Lessons treatment when the catalogue is empty.

- [ ] **Step 4: Implement grouped catalogue sections**

Read the optional route category, order that category first, and render each category with an earned/total heading and a responsive three-column grid. Render every badge name without a one-line clamp, its one-sentence description, and progress for locked badges. Apply opacity/grayscale-style neutral containers to unearned assets while keeping earned art in colour.

- [ ] **Step 5: Update route typing and run focused tests**

Change `BadgeCatalogue: undefined` to `BadgeCatalogue: { category?: BadgeCategory } | undefined` and run the badge grouping/static tests.

Expected: PASS.

### Task 6: Full verification and phone-size inspection

**Files:**
- Modify only files required to correct verification failures caused by these changes.

- [ ] **Step 1: Run all frontend regression programs and Jest checks**

Run every file in `tests/` using its established Jest or TypeScript compile/run form.

Expected: zero failures.

- [ ] **Step 2: Run TypeScript**

Run: `pnpm exec tsc --noEmit`

Expected: exit 0, or report pre-existing diagnostics separately and confirm no diagnostics originate in changed files.

- [ ] **Step 3: Run relevant backend tests**

Run: `python -m pytest Question-generator-BE/tests/test_gamification_services.py Question-generator-BE/tests/test_gamification_api.py -q`

Expected: zero failures.

- [ ] **Step 4: Export and inspect at a standard-phone viewport**

Run an Expo web export/start using installed tooling, open the affected routes in a 390 × 844 viewport, and inspect screenshots for complete matching text, visible fixed actions, correct celebration sequence, and categorized badges.

- [ ] **Step 5: Review scope**

Run `git diff --check`, `git status --short`, and `git diff --stat`; confirm only the planned client files and focused tests changed.
