# Level Progression Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return users to Home with the true next level unlocked/highlighted, reset every quiz question to the top, and load the same complete progression history on every device.

**Architecture:** Put Appwrite page traversal in a small pure utility and expose one completed-level service that all progression screens use. Keep the existing completion navigation and progression resolver, and add a tested scroll-reset helper used by the quiz ScrollView effect.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript 5.9, Appwrite 26, existing assertion-script test convention.

---

## File Structure

- Create `src/utils/appwritePagination.ts`: generic cursor-page traversal with repeated-cursor protection.
- Create `src/services/completedLevelService.ts`: Appwrite-specific completed-level queries and ID normalization.
- Create `tests/appwritePagination.test.ts`: multi-page, deduplication-input, short-page, and repeated-cursor regression coverage.
- Modify `src/screens/main/HomeScreen.tsx`: hydrate completion state through the shared service.
- Modify `src/screens/game/QuestionScreen.tsx`: use the shared service for entry/sync and reset quiz scroll.
- Modify `src/screens/tutorial/TutorialHubScreen.tsx`: use the shared service for completed progression.
- Modify `src/utils/quizProgress.ts`: expose the small, platform-neutral scroll reset operation.
- Modify `tests/quizProgress.test.ts`: verify reset call and missing-ref behavior.

### Task 1: Paginated completed-level source of truth

**Files:**
- Create: `src/utils/appwritePagination.ts`
- Create: `src/services/completedLevelService.ts`
- Create: `tests/appwritePagination.test.ts`

- [ ] **Step 1: Write the failing pagination tests**

Create `tests/appwritePagination.test.ts` with fake pages totaling more than one page. Assert that `collectCursorPages` returns every document in order, stops after a short page, and throws `Repeated pagination cursor: <id>` if a full page ends with the same cursor twice.

```ts
import { collectCursorPages } from '../src/utils/appwritePagination';

type Doc = { $id: string; level: string };

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
};

const run = async () => {
  const calls: Array<string | null> = [];
  const pages: Record<string, Doc[]> = {
    first: [{ $id: '1', level: 'level-1' }, { $id: '2', level: 'level-2' }],
    '2': [{ $id: '3', level: 'level-3' }],
  };
  const documents = await collectCursorPages(async (cursor) => {
    calls.push(cursor);
    return pages[cursor ?? 'first'];
  }, 2);

  assertEqual(documents.length, 3, 'collects every completed-level page');
  assertEqual(calls.join(','), ',2', 'continues from the final document cursor');

  let repeatedCursorError = '';
  try {
    await collectCursorPages(async () => [
      { $id: 'same', level: 'a' },
      { $id: 'same', level: 'b' },
    ], 2);
  } catch (error) {
    repeatedCursorError = error instanceof Error ? error.message : String(error);
  }
  assertEqual(repeatedCursorError, 'Repeated pagination cursor: same', 'guards malformed repeated cursors');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
New-Item -ItemType Directory -Force -Path .dist\appwrite-pagination-test | Out-Null
node_modules\.bin\tsc --target ES2020 --module commonjs --skipLibCheck --outDir .dist\appwrite-pagination-test tests\appwritePagination.test.ts
```

Expected: TypeScript fails because `src/utils/appwritePagination.ts` does not exist.

- [ ] **Step 3: Implement the generic paginator**

Create `src/utils/appwritePagination.ts`:

```ts
export type CursorDocument = { $id: string };

export const collectCursorPages = async <T extends CursorDocument>(
  fetchPage: (cursor: string | null) => Promise<T[]>,
  pageSize: number
): Promise<T[]> => {
  const documents: T[] = [];
  let cursor: string | null = null;

  while (true) {
    const page = await fetchPage(cursor);
    documents.push(...page);

    if (page.length < pageSize) return documents;

    const nextCursor = page[page.length - 1]?.$id;
    if (!nextCursor || nextCursor === cursor) {
      throw new Error(`Repeated pagination cursor: ${nextCursor ?? ''}`);
    }
    cursor = nextCursor;
  }
};
```

- [ ] **Step 4: Run the paginator test and verify GREEN**

Compile with the Step 2 command, then run:

```powershell
node .dist\appwrite-pagination-test\tests\appwritePagination.test.js
```

Expected: exit code 0 with no error output.

- [ ] **Step 5: Implement the shared completed-level service**

Create `src/services/completedLevelService.ts` with a page size of 100. Call `databases.listDocuments` using `userId`, `isCompleted: true`, `Query.limit(100)`, and `Query.cursorAfter(cursor)` after the first page. Pass each page’s `documents` to `collectCursorPages`, then return unique non-empty string `level` values.

```ts
import { COLLECTIONS, DB_ID, Query, databases } from './appwrite';
import { collectCursorPages } from '../utils/appwritePagination';

const COMPLETED_LEVEL_PAGE_SIZE = 100;

export const getCompletedLevelIds = async (userId: string): Promise<string[]> => {
  const documents = await collectCursorPages(async (cursor) => {
    const queries = [
      Query.equal('userId', userId),
      Query.equal('isCompleted', true),
      Query.limit(COMPLETED_LEVEL_PAGE_SIZE),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await databases.listDocuments(DB_ID, COLLECTIONS.USER_PROGRESS, queries);
    return response.documents;
  }, COMPLETED_LEVEL_PAGE_SIZE);

  return Array.from(new Set(
    documents
      .map((document) => document.level)
      .filter((level): level is string => typeof level === 'string' && level.length > 0)
  ));
};
```

- [ ] **Step 6: Type-check the service**

Run `node_modules\.bin\tsc --noEmit`.

Expected: exit code 0.

### Task 2: Route every progression read through the shared service

**Files:**
- Modify: `src/screens/main/HomeScreen.tsx`
- Modify: `src/screens/game/QuestionScreen.tsx`
- Modify: `src/screens/tutorial/TutorialHubScreen.tsx`
- Test: `tests/progressBehavior.test.ts`

- [ ] **Step 1: Run existing progression tests as the pre-change baseline**

Compile and run `tests/progressBehavior.test.ts` using the existing CommonJS assertion-test pattern. Expected: exit code 0.

- [ ] **Step 2: Replace Home’s first-page query**

Import `getCompletedLevelIds`. Replace the direct `databases.listDocuments(...USER_PROGRESS...)` block with:

```ts
const appwriteCompletedLevels = await getCompletedLevelIds(user.$id);
const mergedSet = new Set<string>([
  ...latestCompletedLevels,
  ...appwriteCompletedLevels,
]);
```

Keep the existing cache fallback and `saveCompletedLevels` call.

- [ ] **Step 3: Replace Question-screen all-completed reads**

Import `getCompletedLevelIds`. Use it for entry validation near level loading and for the immediate post-completion cache synchronization. Keep level-specific completed/in-progress queries unchanged.

```ts
const remoteCompletedLevelIds = await getCompletedLevelIds(user.$id);
const completedLevelIds = new Set<string>([
  ...cachedCompletedLevels,
  ...remoteCompletedLevelIds,
]);
```

and:

```ts
const syncLevelIds = await getCompletedLevelIds(user.$id);
```

- [ ] **Step 4: Replace Tutorial Hub’s first-page query**

Import `getCompletedLevelIds`, remove the direct all-completed `listDocuments` call, and construct the Set from the shared result:

```ts
const completedLevelIds = new Set(await getCompletedLevelIds(user.$id));
```

- [ ] **Step 5: Verify progression and types**

Run the focused progress behavior test and `node_modules\.bin\tsc --noEmit`.

Expected: both exit with code 0; Home still merges local and remote IDs and the next playable level remains current/unlocked.

### Task 3: Reset every quiz question to the top

**Files:**
- Modify: `src/utils/quizProgress.ts`
- Modify: `tests/quizProgress.test.ts`
- Modify: `src/screens/game/QuestionScreen.tsx`

- [ ] **Step 1: Write the failing scroll-reset tests**

Import `resetQuizScrollPosition` in `tests/quizProgress.test.ts`. Add a fake scroll target and assert exact arguments plus missing-target safety:

```ts
const scrollCalls: Array<{ y: number; animated: boolean }> = [];
resetQuizScrollPosition({
  scrollTo: (options) => scrollCalls.push(options),
});
resetQuizScrollPosition(null);

assertEqual(scrollCalls.length, 1, 'resets quiz scrolling exactly once when a target exists');
assertEqual(scrollCalls[0].y, 0, 'resets each question to the top');
assertEqual(scrollCalls[0].animated, false, 'avoids visible scroll animation between questions');
```

- [ ] **Step 2: Run the quiz progress test and verify RED**

Compile `tests/quizProgress.test.ts` to a dedicated `.dist` test directory.

Expected: TypeScript fails because `resetQuizScrollPosition` is not exported.

- [ ] **Step 3: Add the minimal tested helper**

Append to `src/utils/quizProgress.ts`:

```ts
export type QuizScrollTarget = {
  scrollTo: (options: { y: number; animated: boolean }) => void;
};

export const resetQuizScrollPosition = (target: QuizScrollTarget | null): void => {
  target?.scrollTo({ y: 0, animated: false });
};
```

- [ ] **Step 4: Run the quiz progress test and verify GREEN**

Compile and run the test. Expected: exit code 0.

- [ ] **Step 5: Wire the Question ScrollView**

In `QuestionScreen`, create `const quizScrollRef = useRef<ScrollView>(null);`, assign `ref={quizScrollRef}`, and add:

```ts
useEffect(() => {
  if (viewMode === 'quiz') {
    resetQuizScrollPosition(quizScrollRef.current);
  }
}, [currentQuestionIndex, levelId, viewMode]);
```

Import `resetQuizScrollPosition` from `quizProgress`. This covers next-question changes, a new level, resumed quiz state, and the transition from article to the first quiz question.

- [ ] **Step 6: Type-check the app**

Run `node_modules\.bin\tsc --noEmit`.

Expected: exit code 0.

### Task 4: Full verification and handoff

**Files:**
- Verify all modified files and test artifacts only.

- [ ] **Step 1: Run every repository assertion test**

Compile all `tests/*.test.ts` files to `.dist/all-tests`, then execute each emitted JavaScript test. Run the existing JavaScript test directly.

Expected: every test exits 0.

- [ ] **Step 2: Run TypeScript and web export checks**

Run:

```powershell
node_modules\.bin\tsc --noEmit
pnpm web:export
```

Expected: both commands exit 0 without new errors.

- [ ] **Step 3: Inspect the final diff**

Use `git -c safe.directory=C:/Users/USER/Downloads/Documents/Codes/MoneyQuest diff --check` and `git ... diff --stat`. Confirm no unrelated user files changed and no whitespace errors exist.

- [ ] **Step 4: Commit implementation**

Stage only the new pagination/service/tests and the three progression/scroll consumers. Commit with:

```text
fix: sync level progression across devices
```
