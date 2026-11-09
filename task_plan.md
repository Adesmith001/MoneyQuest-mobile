# Task Plan: Shared-Device Login Isolation (Web)

## Goal
On shared school computers, every student must be able to log in with their own account, and one student's progress must never affect another student's account.

## Next Step
Await approval for the bounded startup-recovery design, then begin Phase 5 with a failing regression test.

## Current Phase
Phase 4 (complete); Phase 5 pending approval

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm the failure: on shared PCs, the previous student's Appwrite session is silently restored, the login screen is unreachable, and play lands on the previous student's account
- [x] Confirm user-scoped Redux state already resets when the signed-in user changes
- **Status:** complete

### Phase 2: Implementation
- [x] Add a per-tab web session marker (sessionStorage) so only the tab that signed in can restore the session
- [x] On web boot, end leftover sessions so every new visit starts at the login screen
- [x] Make sign-out resilient (never throws) and always clear local auth state
- [x] Prevent the previous student's dashboard from flashing while the auth check runs
- **Status:** complete

### Phase 3: Verification
- [x] Add script-style tests for the session marker utility
- [x] Run TypeScript diagnostics (exit 0)
- [x] Run compiled test programs (exit 0)
- [x] Export the production web bundle
- **Status:** complete

### Phase 4: Startup Timeout Investigation
- [x] Correlate the affected tester's 10:26 AM WAT attempt with Railway and Appwrite telemetry
- [x] Trace the loading watchdog, web-session cleanup, and initial navigation dependencies
- [x] Decide from evidence whether this is stale client state or a code-level startup failure
- **Status:** complete

### Phase 5: Regression Fix and Verification
- [ ] Add a failing regression test for the confirmed root cause
- [ ] Implement the smallest code fix
- [ ] Run focused auth/bootstrap tests, TypeScript diagnostics, and a production web export
- **Status:** pending

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Restore web sessions only within the same tab (sessionStorage marker) | Refreshing keeps the student logged in; a new visit starts logged out so the next student can always sign in |
| Delete the leftover Appwrite session at web boot | Guarantees the login screen is reachable and no progress bleeds between students on a shared computer |
| Keep native (phone) session restore unchanged | Personal devices are not shared; no need to re-login there |
| Cap the boot auth check with timeouts | The loading gate can never hang on a slow or dead network |
| Treat the reported loading watchdog as a code path until logs prove otherwise | The message is rendered by MoneyQuest itself and appeared after the shared-device session changes |
| Classify the change as bounded and require design approval before implementation | The failure is isolated to the existing static bootstrap/recovery and Vercel cache configuration |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| Root Jest discovery rejects script-style TypeScript checks ("must contain at least one test") | 1 | Used the repository's intended compiled-program runner; scoped checks passed |
| Ad-hoc test compile lacks `@types/node` for `tests/authProfile.test.ts` | 1 | Compiled with `--types node`; program exited 0 |
| Expo export verification dir could not be deleted (Windows long paths) | 1 | Mirrored an empty dir over it with robocopy, then removed it |
| PowerShell range-print helper had a parser error | 1 | Replaced the nested inline loop with direct `Get-Content | Select-Object` slices |
| Web tool could not access either known frontend domain | 1 | Logged the limitation and continued with production telemetry plus local exported artifacts |
| Python Playwright is not installed in the workspace Python 3.8 runtime | 1 | Used the already-installed Node Playwright package for equivalent live-browser diagnostics |
| Playwright's bundled Chromium executable is absent | 1 | Reconfigured the diagnostic to use the installed Google Chrome channel |

## Original Task Plan: Mobile QA Celebrations and Badges

## Goal
Fix the phone-size matching, post-lesson celebration, navigation, and categorized badge issues reported by QA using the supplied Money Quest designs.

## Next Step
Implement the approved Figma parity changes with the smallest reusable visual primitives.

## Current Phase
Phase 11

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
- [x] Review diff and deliver
- **Status:** complete

### Phase 10: Figma Parity Tests
- [x] Add failing source-level contracts for the full quest layout, celebration screens, and badge/profile states
- [x] Add a chest-tab navigation regression check
- **Status:** complete

### Phase 11: Figma Parity Implementation
- [ ] Match the full quest catalogue and locked-adventure layout
- [ ] Match daily quest and celebration hierarchy/actions
- [ ] Match profile badge category cards and badge catalogue
- **Status:** in_progress

### Phase 12: Visual and Automated Verification
- [ ] Run focused tests and TypeScript diagnostics
- [ ] Render standard phone viewport and compare against references
- [ ] Review the final diff and deliver
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
