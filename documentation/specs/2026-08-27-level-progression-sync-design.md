# Level Progression and Cross-Device Sync Design

## Goal

After a passed lesson, Continue returns to Home and Home immediately shows the next playable level as unlocked and current. Each quiz question starts at the top. Completed-level state remains consistent for the same account across web, native mobile, and different devices.

## Root Causes

1. Completed-level reads query Appwrite without pagination. Appwrite therefore returns only its default first page. The device where a lesson was completed still looks correct because its local cache contains additional IDs, while a fresh device only sees the incomplete remote page.
2. The quiz `ScrollView` has no ref-driven reset when `currentQuestionIndex` changes, so React Native preserves the previous vertical offset.
3. The post-lesson flow correctly returns Home, and completion already calculates and writes the next playable level. Home can still render stale/locked state when its remote completion read is incomplete.

## Design

### Shared completed-level reader

Add one shared function that reads every completed `USER_PROGRESS` document for a user in deterministic Appwrite pages. Each page uses a fixed limit and an explicit document ordering; subsequent pages use the last document as the cursor. The function returns unique, valid level IDs.

Replace every unbounded “all completed levels” read used for progression with this function:

- Home learning-path hydration
- Question-screen entry validation and immediate post-completion cache synchronization
- Tutorial Hub progression lookup

Queries for one specific level or one in-progress record remain unchanged because their filters already target a narrow result.

Home continues merging remote IDs with the user-scoped local cache. Appwrite is the cross-device source of truth; the local cache remains the offline/instant-read layer.

### Home progression after completion

Keep the existing completion and celebration navigation: Continue ultimately calls `popToTop()` and returns Home. Do not automatically open another lesson.

The existing completion path will continue to:

- mark the finished level complete remotely and locally;
- resolve the next playable regular level;
- update the Appwrite user document and Redux user state with the next level and section.

Once Home reads the full completion history, the existing `getLevelProgressState` logic will mark completed levels complete and the next playable level current/unlocked, including when a persisted current-level pointer still references a completed level.

### Question scroll reset

Attach a ref to the quiz `ScrollView`. After quiz render, reset it to `{ y: 0, animated: false }` whenever the level or current question changes. Also reset when entering quiz mode so the first question begins at the top after the article view.

The reset is local to quiz content and does not change Home’s horizontal section position or article scrolling.

## Error Handling

- Remote pagination errors propagate to existing screen-level fallbacks. Home keeps cached progress if the network fails.
- The pagination loop stops on a short page and guards against a repeated cursor to avoid an infinite loop on malformed responses.
- Invalid or duplicate level values are filtered while collecting IDs.
- Scroll reset is a no-op until the ScrollView ref exists.

## Testing

Regression tests will verify:

1. completed-level pagination collects more than one page without duplicates;
2. pagination terminates on a short page and rejects/reports malformed repeated cursors safely;
3. a completed current level promotes the next playable level to current/unlocked (existing progression coverage retained);
4. quiz scroll reset calls `scrollTo({ y: 0, animated: false })` and safely handles a missing ref;
5. focused tests, TypeScript checking, and the existing test suite pass.

## Out of Scope

- Automatically launching the next lesson
- Changing the lesson-completion or celebration UI
- Migrating completion history into the user document
- Changing offline conflict semantics beyond merging unique completed IDs
