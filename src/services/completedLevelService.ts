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

    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    const response = await databases.listDocuments(
      DB_ID,
      COLLECTIONS.USER_PROGRESS,
      queries
    );
    return response.documents;
  }, COMPLETED_LEVEL_PAGE_SIZE);

  return Array.from(
    new Set(
      documents
        .map((document) => document.level)
        .filter(
          (level): level is string => typeof level === 'string' && level.length > 0
        )
    )
  );
};
