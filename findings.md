# Findings & Decisions

## Requirements

- Add Quests, Chests, and Badges to the tutorial for new users.
- Existing users who update must see a one-time announcement for the new features.
- The update announcement must not appear on every launch.

## Research Findings

- `tutorial` Redux state is persisted through Redux Persist and normalized for legacy state.
- `AppNavigator` already owns the post-splash decision to show `AppTourScreen`.
- `AppTourScreen` currently always completes the original app-tour boolean.
- Existing installs have `hasCompletedAppTour: true`; legacy state can gain a new default field through `normalizeTutorialState`.
- Tutorial Hub replays the full app tour by resetting `hasCompletedAppTour`; completing that replay should also mark the current feature announcement as seen.

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Add `latestFeatureTourVersionSeen` to tutorial state | Enables deterministic migration behavior without using app-version string parsing |
| Give AppTourScreen `mode: first-run | update` | Reuses UI while allowing different slide sets and completion actions |
| Current feature version starts at 1 | Legacy/new normalized state starts at 0, making eligibility explicit |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Working tree already contains the approved raw-text crash fix | Preserve it and limit new edits to tutorial-related files/tests |

## Resources

- `src/store/slices/tutorialSlice.ts`
- `src/store/index.ts`
- `src/navigation/AppNavigator.tsx`
- `src/screens/tutorial/AppTourScreen.tsx`
- `tests/tutorialState.test.ts`
# 2026-09-15 Mobile QA Findings

- `MatchingQuestion.tsx` clamps both columns with `numberOfLines={2}`; this directly causes the ellipsized definitions in QA image 1.
- The lesson completion screen puts a 350px mascot block plus margins inside its ScrollView before the Continue button. On the QA phone the action is below the fold, so the user never advances into the badge and quest screens.
- `CelebrationFlow` already sequences post-lesson screens, but `buildCelebrationsFromBundle` can prepend a combined `primary_celebration` and then add the same explicit badge/quest results again.
- Badge data already contains `category`, progress, earned state, description, and artwork. The current profile and catalogue flatten that data instead of presenting the PRD categories.
- Visual direction from the ZIP: orange celebration hero, white field, navy/orange data colors, rounded bordered cards, strong medal/badge/fox art, and an always-visible bottom action.

# 2026-09-15 Figma Parity Follow-up

- The bottom chest icon already maps directly to `QuestsScreen`, so navigation needs a regression test rather than a routing rewrite.
- `QuestsScreen` currently inserts backend chest claim cards above Active Challenges; the supplied all-quests reference instead presents Active Challenges, Hall of Fame, then Locked Adventures.
- `DailyQuestScreen`, `LevelCompletionScreen`, and `AchievementUnlockScreen` currently add secondary footer copy/actions that are not present in the supplied references.
- Profile category cards use rounded rectangles and generic Ionicons; the references use large outlined hexagons, three small hex previews, category-specific pastel backgrounds, and compact `8/24`-style counts.
- The supplied screenshots are the available visual source of truth; no Figma node URL or inspectable design metadata was provided.
