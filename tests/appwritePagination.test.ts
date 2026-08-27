import { collectCursorPages } from '../src/utils/appwritePagination';

type Doc = { $id: string; level: string };

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const run = async () => {
  const calls: Array<string | null> = [];
  const pages: Record<string, Doc[]> = {
    first: [
      { $id: '1', level: 'level-1' },
      { $id: '2', level: 'level-2' },
    ],
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
      { $id: 'same', level: 'level-a' },
      { $id: 'same', level: 'level-b' },
    ], 2);
  } catch (error) {
    repeatedCursorError = error instanceof Error ? error.message : String(error);
  }

  assertEqual(
    repeatedCursorError,
    'Repeated pagination cursor: same',
    'guards malformed repeated cursors'
  );
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
