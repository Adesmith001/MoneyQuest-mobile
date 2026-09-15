# Mobile QA, Celebration, and Badge Corrections

## Scope

Correct the QA findings on standard phone-sized screens while preserving the existing React Native navigation, Redux gamification state, and backend award logic. The supplied files in `Money Quest.zip` are the visual reference for the completion, badge-unlock, quest, profile, and badge catalogue screens.

## Matching Questions

- Matching cards must display their complete text; no `numberOfLines` truncation or ellipsis.
- Each row grows to the height required by the longer card in that row so the left and right cards remain visually paired.
- The full question page may scroll vertically when all five expanded rows do not fit on a short phone. Individual matching cards do not scroll.
- Existing selection, correctness feedback, fade, and manual-submit behavior remains unchanged.

## Post-Lesson Flow

The post-lesson sequence is deterministic:

1. Lesson Complete always appears.
2. Each newly awarded badge appears once.
3. Each newly completed quest appears once; a newly claimed chest appears once.
4. The user returns to Home.

Combined backend `primary_celebration` payloads must not duplicate badge or quest screens. They are used only as a fallback when the result bundle has no explicit awarded badge, completed quest, or claimed chest entry.

All post-lesson screens use the supplied designs as the visual reference and must fit standard phone heights. The content area can scroll when necessary, but the action area remains visible. Each screen provides:

- a primary Continue action that advances through the sequence;
- an explicit Back to Home action;
- concise copy explaining what happens next;
- transform/opacity-only entrance animation using the existing React Native Animated API.

The Lesson Complete screen displays the earned XP, accuracy, current streak state, mascot artwork, and a next-step prompt. The streak card uses the route/backend message rather than claiming a streak was extended when it was not.

The badge screen displays the awarded badge name, uploaded artwork when available, award-specific copy, and progress toward the next badge when that information exists. The quest screen displays the completed quest, reward, and current quest progress using the supplied quest artwork/layout.

## Badge Information Architecture

The Profile badge area becomes a set of category summary cards rather than a flat six-badge list. Categories come from backend badge data and are ordered as:

1. Journey
2. Section
3. Consistency
4. Achievement

Legacy Quest-category badge data remains visible after those four categories so existing records are not hidden.

Each category card shows its earned/total count and up to three badge previews. Tapping a category opens the dedicated catalogue focused on that category. The catalogue groups all badges by category, retains an overall `X of Y badges earned` count, shows earned artwork in full colour, and presents unearned artwork as visibly greyed/locked. Every badge retains its name, one-sentence description, and progress state.

## Navigation and State

- Keep the current `LevelCompletion` route and `CelebrationFlow` wrapper.
- Pass the intended badge catalogue category as an optional route parameter.
- Continue actions advance the local celebration queue; Back to Home clears pending celebrations and explicitly navigates to the Home tab.
- Badge/quest unlock persistence remains owned by the backend. The client only renders newly awarded/completed result entries and refreshes catalogue/profile state through existing endpoints.

## Focused Verification

Add only regression coverage that protects the reported failures:

- matching text is not line-clamped and matching cards can grow;
- a combined backend celebration does not duplicate explicit badge/quest celebrations;
- post-lesson screens expose both Continue and Back to Home actions;
- badge catalogue data groups and orders categories correctly, including legacy categories.

Run the focused tests first, then the complete existing frontend test set, TypeScript compilation, and the relevant backend gamification tests. Perform a phone-sized visual check of the affected screens after the automated checks pass.

## Out of Scope

- New badge artwork or changes to backend trigger thresholds.
- New animation libraries, Lottie assets, or particle systems.
- Quest monetization rules or chest reward-definition changes.
- Unrelated profile, subscription, lesson, or dashboard refactors.
