# Task Plan: Versioned Gamification Tutorial

## Goal
Teach new users about Quests, Chests, and Badges during first-run onboarding and show existing users a one-time update tour.

## Next Step
Deliver the verified implementation to the user.

## Current Phase
Phase 5

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

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Persist a numeric feature-tour version | Existing users see each announcement once; future updates can increment one constant |
| Reuse AppTourScreen with a compact update mode | Avoids a duplicate screen and keeps tutorial presentation consistent |
| Include all three features in first-run slides | New installs learn the complete gamification flow |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| Combined multi-file patch could not match encoded Tutorial Hub text | 1 | Split patch and match stable ASCII context |
| None | 1 | — |
