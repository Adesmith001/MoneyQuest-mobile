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
