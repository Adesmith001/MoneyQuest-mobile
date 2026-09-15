# Task Plan: Mobile QA Celebrations and Badges

## Goal
Fix the phone-size matching, post-lesson celebration, navigation, and categorized badge issues reported by QA using the supplied Money Quest designs.

## Next Step
Write and run the failing combined-celebration regression test.

## Current Phase
Phase 7

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
- [ ] Add failing queue and navigation-action tests
- [ ] De-duplicate celebration payloads
- [ ] Make actions permanently visible and match supplied layouts
- **Status:** in_progress

### Phase 8: Categorized Badges
- [ ] Add failing category grouping tests
- [ ] Replace flat profile badges with category cards
- [ ] Group catalogue badges by PRD category
- **Status:** pending

### Phase 9: Verification and Delivery
- [ ] Run focused and full tests
- [ ] Run TypeScript and backend gamification checks
- [ ] Inspect at a standard-phone viewport
- [ ] Review diff and deliver
- **Status:** pending

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Persist a numeric feature-tour version | Existing users see each announcement once; future updates can increment one constant |
| Reuse AppTourScreen with a compact update mode | Avoids a duplicate screen and keeps tutorial presentation consistent |
| Include all three features in first-run slides | New installs learn the complete gamification flow |
| Execute inline on `main` | User explicitly requested inline execution after the worktree workflow was offered |
| Grow matching rows with content | User explicitly rejected card-level scrolling; the page may scroll when needed |
| Reuse existing navigation and backend state | Smallest safe fix; the existing flow already carries awards and quest results |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| Combined multi-file patch could not match encoded Tutorial Hub text | 1 | Split patch and match stable ASCII context |
| None | 1 | — |
| Matching layout test expected a standalone style prop while implementation correctly used a style array | 1 | Match the presence of `styles.matchItemWrapper` inside the style array |
