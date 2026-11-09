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

## 2026-11-09 Web Startup Timeout Investigation

- A tester reported MoneyQuest's own startup fallback screen at approximately 10:26 AM WAT: "Loading MoneyQuest... The app is taking too long to start. Check your connection and retry."
- This is not a browser cache error page; it is application-rendered UI, so the investigation must trace the app bootstrap and auth gate before recommending cache clearing.
- The active repository plan shows a recently completed shared-device web-session change that deletes leftover Appwrite sessions at web boot and caps boot auth checks with timeouts. That path is a plausible regression boundary and requires log/code correlation.
- Production correlation for 10:24–10:31 AM WAT: Railway received zero requests, while Appwrite successfully received 18 Windows web lifecycle events. The affected browser therefore had Internet/Appwrite connectivity, but the MoneyQuest React bundle did not reach its application bootstrap.
- The exact screenshot copy is defined in `public/index.html`, outside React. It appears after 10 seconds only if Expo has not replaced `#bootstrap-status`; therefore the failure occurs before `AppNavigator`, Redux rehydration, session cleanup, or Railway content loading.
- The production web export is three deferred scripts, including a 2.89 MB main bundle. A slow/blocked/stale script can leave the static watchdog visible even when Appwrite is reachable from other open tabs.
- `public/index.html` already attempts to unregister legacy service workers and delete `moneyquest-*` caches, but the plain Retry button only calls `location.reload()`. If an obsolete controller or poisoned browser cache is still serving the shell/bundle, Retry can repeat the same failure instead of performing a clean recovery.
- Direct web-tool access to the two known MoneyQuest frontend domains failed with a tool-level accessibility error, so deployed asset headers still need verification by another route.
- Direct HTTP verification succeeded afterward: the production HTML and all three JavaScript assets return 200. The live main bundle is about 2.89 MB, downloaded in roughly 5 seconds on the investigation connection, and is served with `max-age=0`.
- Normal headless Chrome reproduction mounted the login screen successfully with the main bundle response completing around 5.6 seconds.
- Throttled Chrome reproduction at a usable 1 Mbps/150 ms connection produced the tester's exact screen after 10 seconds. The main bundle had not completed, but there were no HTTP or JavaScript errors. This confirms the displayed "failure" can be a false timeout caused by bundle delivery speed.
- Conclusion: clearing the affected browser's cache/service-worker state is a valid immediate recovery step, but the durable issue is code/deployment behavior: a premature 10-second watchdog, a Retry button that only reloads, a large main bundle, and ineffective intended immutable headers.

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
