# Task Plan: Mobile QA Celebrations and Badges

## Goal
Fix the phone-size matching, post-lesson celebration, navigation, and categorized badge issues reported by QA using the supplied Money Quest designs.

## Next Step
Run final verification, review the committed diff, and deliver the handoff.

## Current Phase
Phase 9

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm Quests, Chests, and Badges are in scope
- [x] Inspect persisted tutorial state and navigation flow
- [x] Obtain approval for full first-run and concise update tours
- **Status:** complete

### Phase 2: Tests
- [x] Add failing state/version behavior tests
- [x] Add failing tour-content regression test
- **Status:** complete

### Phase 3: Implementation
- [x] Add persisted feature-tour version
- [x] Add gamification slides and update-tour mode
- [x] Route eligible existing users through the update tour once
- **Status:** complete

### Phase 4: Verification
- [x] Run focused tests
- [x] Run changed-file TypeScript diagnostics
- [x] Export the Android bundle
- **Status:** complete

### Phase 5: Delivery
- [x] Review diff and summarize handoff
- **Status:** complete

### Phase 6: Mobile Matching Layout
- [x] Add a failing complete-text and stretching regression test
- [x] Make matching cards grow with their text
- [x] Run focused matching tests
- **Status:** complete

### Phase 7: Celebration Flow and Screens
- [x] Add failing queue and navigation-action tests
- [x] De-duplicate celebration payloads
- [x] Make actions permanently visible and match supplied layouts
- **Status:** complete

### Phase 8: Categorized Badges
- [x] Add failing category grouping tests
- [x] Replace flat profile badges with category cards
- [x] Group catalogue badges by PRD category
- **Status:** complete

### Phase 9: Verification and Delivery
- [x] Run focused tests
- [x] Run TypeScript and backend gamification checks
- [x] Inspect at a standard-phone viewport
- [ ] Review diff and deliver
- **Status:** in_progress

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Persist a numeric feature-tour version | Existing users see each announcement once; future updates can increment one constant |
| Reuse AppTourScreen with a compact update mode | Avoids a duplicate screen and keeps tutorial presentation consistent |
| Include all three features in first-run slides | New installs learn the complete gamification flow |
| Execute inline on `main` | User explicitly requested inline execution after the worktree workflow was offered |
| Grow matching rows with content | User explicitly rejected card-level scrolling; the page may scroll when needed |
| Reuse existing navigation and backend state | Smallest safe fix; the existing flow already carries awards and quest results |
| Keep all five category summaries visible | Users can discover the PRD classifications even when the backend has not seeded badge definitions for a category |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| Combined multi-file patch could not match encoded Tutorial Hub text | 1 | Split patch and match stable ASCII context |
| None | 1 | — |
| Matching layout test expected a standalone style prop while implementation correctly used a style array | 1 | Match the presence of `styles.matchItemWrapper` inside the style array |
| Root TypeScript check reports dashboard-project errors outside this scope | 1 | Filtered diagnostics to changed app files; none were reported, then verified with Expo bundles |
| Python 3.8 cannot import `datetime.UTC` | 1 | Re-ran backend checks with installed Python 3.12 |
| Existing chest service test fails because `_reward_from_payload` is missing | 1 | Logged as an unrelated pre-existing backend defect; 17 other selected gamification tests passed |
| First visual refresh used a stale CI web bundle | 1 | Restarted Metro and reloaded the authenticated profile preview |
| Root Jest discovery treats script-style TypeScript checks as empty Jest suites and pulls Vitest dashboard tests into Jest | 1 | Used the repository's intended per-file runners; all scoped checks pass |
